from django.contrib import admin
from .models import Skill, Verification, Credential

@admin.register(Skill)
class SkillAdmin(admin.ModelAdmin):
    list_display = ('name', 'user', 'status', 'submitted_at')
    list_filter = ('status',)

@admin.register(Verification)
class VerificationAdmin(admin.ModelAdmin):
    list_display = ('skill', 'verifier', 'decision', 'verified_at')

@admin.register(Credential)
class CredentialAdmin(admin.ModelAdmin):
    list_display = ('skill', 'mint_address', 'minted_at')
