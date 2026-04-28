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
    tags = models.JSONField(default=list, blank=True)
    skill_level = models.CharField(max_length=50, blank=True, default='')
    submitted_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.name} ({self.user.username})"

class Verification(models.Model):
    skill = models.OneToOneField(Skill, on_delete=models.CASCADE, related_name='verification')
    verifier = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)  # user with is_verifier=True
    decision = models.CharField(max_length=10, choices=(('approve','Approve'),('reject','Reject')))
    comment = models.TextField(blank=True, default='')
    verified_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Verification for {self.skill.name} by {self.verifier.username if self.verifier else 'Unknown'}"

class Credential(models.Model):
    skill = models.OneToOneField(Skill, on_delete=models.CASCADE, related_name='credential')
    mint_address = models.CharField(max_length=44, unique=True)
    transaction_signature = models.CharField(max_length=88)
    metadata_uri = models.URLField()           # Arweave/IPFS link to metadata JSON
    minted_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Credential for {self.skill.name} ({self.mint_address[:8]}...)"

class AuditLog(models.Model):
    ACTION_CHOICES = (
        ('VERIFY_APPROVE', 'Verification Approved'),
        ('VERIFY_REJECT', 'Verification Rejected'),
    )
    action = models.CharField(max_length=50, choices=ACTION_CHOICES)
    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    details = models.JSONField(default=dict)
    timestamp = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.action} by {self.user} at {self.timestamp}"