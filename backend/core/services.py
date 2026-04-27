import requests
import hashlib
import magic
from django.conf import settings
from rest_framework.exceptions import ValidationError

def upload_to_ipfs(file_content, filename):
    url = "https://api.pinata.cloud/pinning/pinFileToIPFS"
    headers = {"Authorization": f"Bearer {settings.PINATA_JWT}"}
    files = {'file': (filename, file_content)}
    resp = requests.post(url, files=files, headers=headers)
    resp.raise_for_status()
    return resp.json()['IpfsHash']

def generate_solid_sha256(file_obj) -> str:
    sha256_hash = hashlib.sha256()
    file_obj.seek(0)  
    
    for chunk in file_obj.chunks():
        sha256_hash.update(chunk)
        
    file_obj.seek(0)  
    return sha256_hash.hexdigest()

def validate_file_integrity(file_obj, allowed_types):
    header = file_obj.read(2048)
    file_obj.seek(0)  
    
    actual_mime = magic.from_buffer(header, mime=True)
    
    if actual_mime not in allowed_types:
        raise ValidationError({'file': f"Security Alert: File identified as {actual_mime}, which is blocked."})
    
    return actual_mime

def check_hash_with_virustotal(file_hash: str):
    url = f"https://www.virustotal.com/api/v3/files/{file_hash}"
    headers = {
        "accept": "application/json",
        "x-apikey": settings.VIRUSTOTAL_API_KEY
    }
    
    try:
        resp = requests.get(url, headers=headers)
        
        if resp.status_code == 404:
            return True 
            
        resp.raise_for_status()
        data = resp.json()
        
        malicious_votes = data['data']['attributes']['last_analysis_stats']['malicious']
        
        if malicious_votes > 0:
            from rest_framework.exceptions import ValidationError
            raise ValidationError({'file': f'Security Alert: File flagged as malware by {malicious_votes} vendors.'})
            
    except requests.exceptions.RequestException:
        pass