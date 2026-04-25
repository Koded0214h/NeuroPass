from rest_framework.test import APITestCase
from rest_framework import status
from django.contrib.auth.models import User


def create_user(username='testuser', password='testpass123', email='test@example.com'):
    return User.objects.create_user(username=username, password=password, email=email)


def get_tokens(client, username, password='testpass123'):
    resp = client.post('/api/users/login/', {'username': username, 'password': password})
    return resp.data.get('access'), resp.data.get('refresh')


class RegistrationTests(APITestCase):
    def test_register_creates_user_and_profile(self):
        resp = self.client.post('/api/users/register/', {
            'username': 'newuser',
            'email': 'new@example.com',
            'password': 'strongpass123',
        })
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        user = User.objects.get(username='newuser')
        self.assertTrue(hasattr(user, 'profile'))

    def test_register_with_wallet_stores_address(self):
        resp = self.client.post('/api/users/register/', {
            'username': 'walletuser',
            'email': 'wallet@example.com',
            'password': 'strongpass123',
            'wallet_address': 'So11111111111111111111111111111111111111112',
        })
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        user = User.objects.get(username='walletuser')
        self.assertEqual(user.profile.wallet_address, 'So11111111111111111111111111111111111111112')

    def test_register_duplicate_username_fails(self):
        create_user('existing')
        resp = self.client.post('/api/users/register/', {
            'username': 'existing',
            'email': 'other@example.com',
            'password': 'strongpass123',
        })
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_register_missing_password_fails(self):
        resp = self.client.post('/api/users/register/', {
            'username': 'nopass',
            'email': 'nopass@example.com',
        })
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)


class LoginTests(APITestCase):
    def setUp(self):
        self.user = create_user('loginuser')

    def test_login_returns_access_and_refresh_tokens(self):
        resp = self.client.post('/api/users/login/', {
            'username': 'loginuser',
            'password': 'testpass123',
        })
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertIn('access', resp.data)
        self.assertIn('refresh', resp.data)

    def test_login_wrong_password_returns_401(self):
        resp = self.client.post('/api/users/login/', {
            'username': 'loginuser',
            'password': 'wrongpassword',
        })
        self.assertEqual(resp.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_token_refresh_returns_new_access_token(self):
        _, refresh = get_tokens(self.client, 'loginuser')
        resp = self.client.post('/api/users/token/refresh/', {'refresh': refresh})
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertIn('access', resp.data)

    def test_token_refresh_with_invalid_token_fails(self):
        resp = self.client.post('/api/users/token/refresh/', {'refresh': 'notavalidtoken'})
        self.assertEqual(resp.status_code, status.HTTP_401_UNAUTHORIZED)


class MeTests(APITestCase):
    def setUp(self):
        self.user = create_user('meuser', email='me@example.com')
        access, _ = get_tokens(self.client, 'meuser')
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {access}')

    def test_me_returns_username_email_and_profile(self):
        resp = self.client.get('/api/users/me/')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data['username'], 'meuser')
        self.assertEqual(resp.data['email'], 'me@example.com')
        self.assertIn('profile', resp.data)
        self.assertIn('wallet_address', resp.data['profile'])
        self.assertIn('is_verifier', resp.data['profile'])

    def test_me_unauthenticated_returns_401(self):
        self.client.credentials()
        resp = self.client.get('/api/users/me/')
        self.assertEqual(resp.status_code, status.HTTP_401_UNAUTHORIZED)


class LinkWalletTests(APITestCase):
    def setUp(self):
        self.user = create_user('wallettest')
        access, _ = get_tokens(self.client, 'wallettest')
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {access}')

    def test_link_wallet_saves_address(self):
        resp = self.client.patch('/api/users/wallet/', {
            'wallet_address': 'So11111111111111111111111111111111111111112'
        })
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.user.profile.refresh_from_db()
        self.assertEqual(self.user.profile.wallet_address, 'So11111111111111111111111111111111111111112')

    def test_link_wallet_missing_field_returns_400(self):
        resp = self.client.patch('/api/users/wallet/', {})
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_link_wallet_unauthenticated_returns_401(self):
        self.client.credentials()
        resp = self.client.patch('/api/users/wallet/', {
            'wallet_address': 'So11111111111111111111111111111111111111112'
        })
        self.assertEqual(resp.status_code, status.HTTP_401_UNAUTHORIZED)
