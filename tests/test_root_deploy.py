import pathlib
import unittest
ROOT = pathlib.Path(__file__).resolve().parents[1]
class RootDeployTest(unittest.TestCase):
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
