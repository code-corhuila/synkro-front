"""Real-image warm DNS outage regression. No retries or client-budget changes."""
import argparse
from concurrent.futures import ThreadPoolExecutor
import ipaddress
import json
import subprocess
import time
import urllib.error
import urllib.request
import uuid


def execute(host_image, sales_image, products_image):
    owner = uuid.uuid4().hex
    network = 'synkro-proxy-test-' + owner
    containers = []
    result = {'client_deadline_seconds': 15, 'warmup_requests': 80}

    def docker(*args):
        return subprocess.run(['docker', *args], capture_output=True, check=True,
                              timeout=120).stdout.decode().strip()

    def fetch(path):
        started = time.monotonic()
        try:
            with urllib.request.urlopen(origin + path, timeout=15) as response:
                status = response.status
        except urllib.error.HTTPError as error:
            status = error.code
        except (TimeoutError, urllib.error.URLError):
            status = 'CLIENT_TIMEOUT'
        return {'status': status, 'seconds': round(time.monotonic() - started, 3)}

    docker('network', 'create', '--label', 'synkro.execution=' + owner,
           '--label', 'synkro.disposable=true', network)
    try:
        for service, alias, image in [
            ('products', 'synkro-products-portal', products_image),
            ('sales', 'synkro-sales-portal', sales_image), ('host', 'host', host_image)
        ]:
            name = network + '-' + service
            args = ['run', '-d', '--name', name, '--network', network,
                    '--network-alias', alias, '--label', 'synkro.execution=' + owner,
                    '--label', 'synkro.disposable=true']
            if service == 'host':
                args += ['-p', '127.0.0.1::80']
            docker(*args, image)
            containers.append(name)
        origin = 'http://' + docker('port', containers[-1], '80')
        # Port publication is not readiness; this is a fixed start settle, not a retry.
        time.sleep(1)
        result['normal'] = fetch('/remotes/sales/assets/remoteEntry.js')
        assert result['normal']['status'] == 200
        # Warm all nginx workers through real successful requests before removal.
        for _ in range(80):
            assert fetch('/remotes/sales/assets/remoteEntry.js')['status'] == 200
        sales = json.loads(docker('inspect', containers[1]))[0]
        address = sales['NetworkSettings']['Networks'][network]['IPAddress']
        encoded = ipaddress.IPv4Address(address).packed[::-1].hex().upper() + ':0050'
        docker('stop', '--time', '10', containers[1])
        with ThreadPoolExecutor() as pool:
            waiting = pool.submit(fetch, '/remotes/sales/assets/remoteEntry.js')
            result['shell_during_outage'] = fetch('/sales')
            result['products_during_outage'] = fetch('/remotes/products/assets/remoteEntry.js')
            time.sleep(1)
            tcp = docker('exec', containers[-1], 'cat', '/proc/net/tcp')
            result['syn_sent_to_stopped_sales'] = sum(
                1 for line in tcp.splitlines()[1:]
                if line.split()[2] == encoded and line.split()[3] == '02')
            result['unavailable'] = waiting.result()
        docker('start', containers[1])
        result['recovered'] = fetch('/remotes/sales/assets/remoteEntry.js')
        assert result['unavailable']['status'] == 502, 'Unavailable Sales must return controlled 502'
        assert result['unavailable']['seconds'] < 15
        assert result['shell_during_outage']['status'] == 200
        assert result['products_during_outage']['status'] == 200
        assert result['recovered']['status'] == 200
        result['status'] = 'PASSED'
    except AssertionError:
        result['status'] = 'FAILED'
    finally:
        for name in reversed(containers):
            item = json.loads(docker('inspect', name))[0]
            assert item['Config']['Labels'].get('synkro.execution') == owner
            assert not any(mount['Type'] == 'volume' for mount in item['Mounts'])
            docker('rm', '-f', name)
        item = json.loads(docker('network', 'inspect', network))[0]
        assert item['Labels'].get('synkro.execution') == owner and not item['Containers']
        docker('network', 'rm', network)
        result['cleanup'] = 'PASSED'
    return result


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    for name in ('host', 'sales', 'products'):
        parser.add_argument('--' + name + '-image', required=True)
    args = parser.parse_args()
    try:
        result = execute(args.host_image, args.sales_image, args.products_image)
    except (subprocess.SubprocessError, OSError, AssertionError):
        print(json.dumps({'status': 'FAILED', 'reason': 'Resource/cleanup check failed; raw diagnostics suppressed'}))
        raise SystemExit(1)
    print(json.dumps(result))
    raise SystemExit(0 if result['status'] == 'PASSED' else 1)
