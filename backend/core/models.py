from django.db import models
from django.contrib.auth.models import User

class Skill(models.Model):
    STATUS_CHOICES = (
        ('submitted', 'Submitted'),
        ('verified', 'Verified'),
        ('rejected', 'Rejected'),
    )
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='skills')
    name = models.CharField(max_length=255)
    description = models.TextField()
    file_ipfs_hash = models.CharField(max_length=255)   # IPFS CID
    file_sha256 = models.CharField(max_length=64)        # proof hash
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='submitted')
    submitted_at = models.DateTimeField(auto_now_add=True)

class Verification(models.Model):
    skill = models.OneToOneField(Skill, on_delete=models.CASCADE, related_name='verification')
    verifier = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)  # user with is_verifier=True
    decision = models.CharField(max_length=10, choices=(('approve','Approve'),('reject','Reject')))
    comment = models.TextField(blank=True, default='')
    verified_at = models.DateTimeField(auto_now_add=True)

class Credential(models.Model):
    skill = models.OneToOneField(Skill, on_delete=models.CASCADE, related_name='credential')
    mint_address = models.CharField(max_length=44, unique=True)
    transaction_signature = models.CharField(max_length=88)
    metadata_uri = models.URLField()           # Arweave/IPFS link to metadata JSON
    minted_at = models.DateTimeField(auto_now_add=True)