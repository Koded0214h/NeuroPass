from rest_framework import serializers
from .models import Skill, Credential


class CredentialSerializer(serializers.ModelSerializer):
    class Meta:
        model = Credential
        fields = ('id', 'mint_address', 'transaction_signature', 'metadata_uri', 'minted_at')
        read_only_fields = fields


class SkillSerializer(serializers.ModelSerializer):
    credential = CredentialSerializer(read_only=True)

    class Meta:
        model = Skill
        fields = ('id', 'name', 'description', 'file_ipfs_hash', 'file_sha256', 'status', 'tags', 'skill_level', 'submitted_at', 'credential')
        read_only_fields = ('file_ipfs_hash', 'file_sha256', 'status', 'tags', 'skill_level', 'submitted_at', 'user')


class SkillCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Skill
        fields = ('id', 'name', 'description', 'status', 'tags', 'skill_level')
        read_only_fields = ('id', 'status', 'tags', 'skill_level')


class VerificationSerializer(serializers.Serializer):
    decision = serializers.ChoiceField(choices=(('approve', 'Approve'), ('reject', 'Reject')))
    comment = serializers.CharField(required=False, default='')
