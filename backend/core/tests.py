import hashlib
from rest_framework.test import APITestCase
from rest_framework import status
from django.contrib.auth.models import User
from django.core.files.uploadedfile import SimpleUploadedFile
from unittest.mock import patch
from .models import Skill, Verification, Credential


def make_user(username, password='testpass123', is_verifier=False):
    user = User.objects.create_user(username=username, password=password)
    if is_verifier:
        user.profile.is_verifier = True
        user.profile.save()
    return user


def auth_as(client, user, password='testpass123'):
    resp = client.post('/api/users/login/', {'username': user.username, 'password': password})
    client.credentials(HTTP_AUTHORIZATION=f'Bearer {resp.data["access"]}')


def make_skill(user, name='Python', skill_status='submitted'):
    return Skill.objects.create(
        user=user,
        name=name,
        description='A skill',
        file_ipfs_hash='QmFake123',
        file_sha256='a' * 64,
        status=skill_status,
    )


class SkillSubmitTests(APITestCase):
    def setUp(self):
        self.user = make_user('submitter')
        auth_as(self.client, self.user)

    @patch('core.views.upload_to_ipfs', return_value='QmFakeIPFSHash')
    def test_submit_skill_creates_record(self, mock_ipfs):
        file = SimpleUploadedFile('proof.mp4', b'fake video bytes', content_type='video/mp4')
        resp = self.client.post('/api/core/skill/submit/', {
            'name': 'Python Programming',
            'description': 'Can build web apps in Python',
            'file': file,
        }, format='multipart')
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        skill = Skill.objects.get(user=self.user)
        self.assertEqual(skill.name, 'Python Programming')
        self.assertEqual(skill.file_ipfs_hash, 'QmFakeIPFSHash')
        self.assertEqual(skill.status, 'submitted')
        self.assertEqual(len(skill.file_sha256), 64)

    @patch('core.views.upload_to_ipfs', return_value='QmFakeIPFSHash')
    def test_submit_skill_sha256_is_correct(self, mock_ipfs):
        content = b'deterministic file content'
        expected = hashlib.sha256(content).hexdigest()
        file = SimpleUploadedFile('proof.pdf', content, content_type='application/pdf')
        self.client.post('/api/core/skill/submit/', {
            'name': 'Skill', 'description': 'Desc', 'file': file,
        }, format='multipart')
        skill = Skill.objects.get(user=self.user)
        self.assertEqual(skill.file_sha256, expected)

    def test_submit_skill_no_file_returns_400(self):
        resp = self.client.post('/api/core/skill/submit/', {
            'name': 'Test', 'description': 'No file',
        }, format='multipart')
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_submit_skill_disallowed_file_type_returns_400(self):
        file = SimpleUploadedFile('virus.exe', b'bad', content_type='application/x-msdownload')
        resp = self.client.post('/api/core/skill/submit/', {
            'name': 'Test', 'description': 'Desc', 'file': file,
        }, format='multipart')
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_submit_skill_unauthenticated_returns_401(self):
        self.client.credentials()
        file = SimpleUploadedFile('proof.mp4', b'bytes', content_type='video/mp4')
        resp = self.client.post('/api/core/skill/submit/', {
            'name': 'Test', 'description': 'Desc', 'file': file,
        }, format='multipart')
        self.assertEqual(resp.status_code, status.HTTP_401_UNAUTHORIZED)


class SkillListTests(APITestCase):
    def setUp(self):
        self.user = make_user('lister')
        auth_as(self.client, self.user)
        make_skill(self.user, name='Welding')
        make_skill(self.user, name='Cooking')

    def test_list_returns_only_own_skills(self):
        other = make_user('other')
        make_skill(other, name='Other Skill')

        resp = self.client.get('/api/core/skills/')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        names = [s['name'] for s in resp.data['results']]
        self.assertIn('Welding', names)
        self.assertIn('Cooking', names)
        self.assertNotIn('Other Skill', names)

    def test_list_count_matches_submitted_skills(self):
        resp = self.client.get('/api/core/skills/')
        self.assertEqual(resp.data['count'], 2)

    def test_list_includes_required_fields(self):
        resp = self.client.get('/api/core/skills/')
        skill = resp.data['results'][0]
        for field in ('status', 'file_ipfs_hash', 'file_sha256', 'submitted_at'):
            self.assertIn(field, skill)

    def test_list_unauthenticated_returns_401(self):
        self.client.credentials()
        resp = self.client.get('/api/core/skills/')
        self.assertEqual(resp.status_code, status.HTTP_401_UNAUTHORIZED)


class VerificationTests(APITestCase):
    def setUp(self):
        self.owner = make_user('owner')
        self.verifier = make_user('verifier', is_verifier=True)
        self.skill = make_skill(self.owner)

    @patch('core.views.mint_credential_nft', return_value=('MintAddr111', 'TxSig222', 'ipfs://QmMeta'))
    def test_approve_sets_verified_and_creates_credential(self, mock_mint):
        auth_as(self.client, self.verifier)
        resp = self.client.patch(f'/api/core/skill/{self.skill.pk}/verify/', {'decision': 'approve'})
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.skill.refresh_from_db()
        self.assertEqual(self.skill.status, 'verified')
        cred = Credential.objects.get(skill=self.skill)
        self.assertEqual(cred.mint_address, 'MintAddr111')
        self.assertEqual(cred.transaction_signature, 'TxSig222')
        self.assertEqual(cred.metadata_uri, 'ipfs://QmMeta')

    def test_reject_sets_rejected_status_and_stores_comment(self):
        auth_as(self.client, self.verifier)
        resp = self.client.patch(f'/api/core/skill/{self.skill.pk}/verify/', {
            'decision': 'reject',
            'comment': 'Evidence is not convincing',
        })
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.skill.refresh_from_db()
        self.assertEqual(self.skill.status, 'rejected')
        v = Verification.objects.get(skill=self.skill)
        self.assertEqual(v.comment, 'Evidence is not convincing')
        self.assertFalse(Credential.objects.filter(skill=self.skill).exists())

    def test_non_verifier_cannot_verify(self):
        plain = make_user('plain')
        auth_as(self.client, plain)
        resp = self.client.patch(f'/api/core/skill/{self.skill.pk}/verify/', {'decision': 'approve'})
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)

    def test_owner_cannot_self_verify(self):
        self.owner.profile.is_verifier = True
        self.owner.profile.save()
        auth_as(self.client, self.owner)
        resp = self.client.patch(f'/api/core/skill/{self.skill.pk}/verify/', {'decision': 'approve'})
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)

    def test_invalid_decision_returns_400(self):
        auth_as(self.client, self.verifier)
        resp = self.client.patch(f'/api/core/skill/{self.skill.pk}/verify/', {'decision': 'maybe'})
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_unauthenticated_verify_returns_401(self):
        resp = self.client.patch(f'/api/core/skill/{self.skill.pk}/verify/', {'decision': 'approve'})
        self.assertEqual(resp.status_code, status.HTTP_401_UNAUTHORIZED)

    @patch('core.views.mint_credential_nft', side_effect=Exception('Solana RPC timeout'))
    def test_nft_mint_failure_returns_500(self, mock_mint):
        auth_as(self.client, self.verifier)
        resp = self.client.patch(f'/api/core/skill/{self.skill.pk}/verify/', {'decision': 'approve'})
        self.assertEqual(resp.status_code, status.HTTP_500_INTERNAL_SERVER_ERROR)
        self.assertIn('NFT minting failed', resp.data['error'])


class PublicVerifyTests(APITestCase):
    def setUp(self):
        owner = make_user('credowner')
        verifier = make_user('credverifier', is_verifier=True)
        skill = make_skill(owner, name='Carpentry', skill_status='verified')
        Verification.objects.create(skill=skill, verifier=verifier, decision='approve')
        self.credential = Credential.objects.create(
            skill=skill,
            mint_address='MINTPUBKEY999',
            transaction_signature='TXSIG999',
            metadata_uri='ipfs://QmMetaValid',
        )

    def test_valid_credential_returns_full_details(self):
        resp = self.client.get('/api/core/credential/MINTPUBKEY999/')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertTrue(resp.data['valid'])
        self.assertEqual(resp.data['skill_name'], 'Carpentry')
        self.assertEqual(resp.data['verifier'], 'credverifier')
        self.assertEqual(resp.data['mint_address'], 'MINTPUBKEY999')
        self.assertEqual(resp.data['proof_hash'], 'a' * 64)

    def test_nonexistent_credential_returns_404(self):
        resp = self.client.get('/api/core/credential/DOESNOTEXIST/')
        self.assertEqual(resp.status_code, status.HTTP_404_NOT_FOUND)
        self.assertFalse(resp.data['valid'])

    def test_public_verify_requires_no_authentication(self):
        resp = self.client.get('/api/core/credential/MINTPUBKEY999/')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
