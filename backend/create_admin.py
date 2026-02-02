from app import create_app, db, bcrypt
from app.models.usuario import Usuario

app = create_app()

with app.app_context():
    # Verificar se já existe um usuário admin
    admin = Usuario.query.filter_by(username='admin').first()
    if not admin:
        print("Criando usuário administrador padrão...")
        hashed_password = bcrypt.generate_password_hash('admin123').decode('utf-8')
        novo_admin = Usuario(
            username='admin',
            email='admin@vimax.com.br',
            password_hash=hashed_password,
            role='super_admin'
        )
        novo_admin.generate_api_token()
        db.session.add(novo_admin)
        db.session.commit()
        print("Usuário 'admin' criado com a senha 'admin123'.")
    else:
        print("Usuário 'admin' já existe. Garantindo permissões de super_admin...")
        admin.role = 'super_admin'
        db.session.commit()
        print("Permissões de super_admin garantidas para o usuário 'admin'.")
