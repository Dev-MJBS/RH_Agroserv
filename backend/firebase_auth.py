import firebase_admin
from firebase_admin import auth as firebase_auth
from firebase_admin import credentials
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import os
from dotenv import load_dotenv

load_dotenv()

# Initialize Firebase Admin SDK
# You need to download serviceAccountKey.json from Firebase Console
if not firebase_admin._apps:
    # Tenta descobrir o caminho do certificado de forma robusta
    base_dir = os.path.dirname(os.path.abspath(__file__))
    default_path = os.path.join(base_dir, "serviceAccountKey.json")
    
    cert_path = os.getenv("FIREBASE_SERVICE_ACCOUNT_PATH", default_path)
    
    if os.path.exists(cert_path):
        cred = credentials.Certificate(cert_path)
        firebase_admin.initialize_app(cred)
    else:
        # Tenta no diretório atual de execução como último recurso
        if os.path.exists("serviceAccountKey.json"):
            cred = credentials.Certificate("serviceAccountKey.json")
            firebase_admin.initialize_app(cred)
        else:
            print(f"Warning: Firebase credentials not found at {cert_path}. Verification will fail.")

security = HTTPBearer()

async def get_current_user(res: HTTPAuthorizationCredentials = Depends(security)):
    token = res.credentials
    try:
        decoded_token = firebase_auth.verify_id_token(token)
        return decoded_token
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid authentication credentials: {str(e)}",
            headers={"WWW-Authenticate": "Bearer"},
        )
