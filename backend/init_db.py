from database import SessionLocal, engine
from models import User, Base
from auth import get_password_hash

def init_db():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    # Check if admin exists
    admin = db.query(User).filter(User.username == "admin").first()
    if not admin:
        hashed_password = get_password_hash("admin123")
        admin_user = User(username="admin", hashed_password=hashed_password)
        db.add(admin_user)
        db.commit()
        print("Usuário 'admin' criado com sucesso. Senha: admin123")
    else:
        print("Admin já existe.")
    db.close()

if __name__ == "__main__":
    init_db()
