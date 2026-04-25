import requests
import hashlib
from django.conf import settings

def upload_to_ipfs(file_content, filename):
    # using Pinata as an example
    url = "https://api.pinata.cloud/pinning/pinFileToIPFS"
    headers = {"Authorization": f"Bearer {settings.PINATA_JWT}"}
    files = {'file': (filename, file_content)}
    resp = requests.post(url, files=files, headers=headers)
    resp.raise_for_status()
    return resp.json()['IpfsHash']

def sha256_hash(file_content):
    return hashlib.sha256(file_content).hexdigest()