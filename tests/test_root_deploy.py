import pathlib
import unittest
ROOT = pathlib.Path(__file__).resolve().parents[1]
class RootDeployTest(unittest.TestCase):
    def test_sales_outage_preserves_client_budget_and_controlled_status(self):
        config = (ROOT / 'deploy/nginx.conf').read_text()
        sales = config.split('location /remotes/sales/ {', 1)[1].split('}', 1)[0]
        self.assertIn('proxy_connect_timeout 2s;', sales)
        self.assertIn('resolver_timeout 2s;', sales)
        self.assertIn('proxy_intercept_errors on;', sales)
        self.assertIn('error_page 504 =502 @sales_unavailable;', sales)
        self.assertIn('location @sales_unavailable', config)

    def test_internal_delivery(self):
        compose = (ROOT / 'deploy/compose.yml').read_text()
        self.assertIn('networks: [platform]', compose)
        if ROOT.name == 'synkro-products-portal':
            self.assertNotIn('ports:', compose)
            self.assertIn('VITE_BASE_PATH:', compose)
        else:
            self.assertIn('/remotes/products/', (ROOT / 'deploy/nginx.conf').read_text())
            self.assertIn('VITE_PRODUCTS_PORTAL_ENTRY:', compose)
if __name__ == '__main__':
    unittest.main()
