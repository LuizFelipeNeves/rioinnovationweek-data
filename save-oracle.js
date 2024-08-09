const fs = require('fs');
const oracledb = require('oracledb');

// Configurações de conexão ao banco de dados Oracle
const config = {
    user: 'seu_usuario',
    password: 'sua_senha',
    connectString: 'localhost/XEPDB1'
};

(async () => {
    let connection;

    try {
        // Conectar ao banco de dados Oracle
        connection = await oracledb.getConnection(config);
        console.log('Conectado ao banco de dados Oracle.');

        // Ler os arquivos JSON
        const eventos = JSON.parse(fs.readFileSync('./saida/eventos.json', 'utf8'));
        const palestrantes = JSON.parse(fs.readFileSync('./saida/palestrantes.json', 'utf8'));
        const eventos_palestrantes = JSON.parse(fs.readFileSync('./saida/eventos_palestrantes.json', 'utf8'));

        // Criar a tabela eventos se ela não existir
        await connection.execute(`
            CREATE TABLE eventos (
                id NUMBER PRIMARY KEY,
                hora VARCHAR2(255),
                data VARCHAR2(255),
                conferencia VARCHAR2(255),
                durancao VARCHAR2(255),
                titulo VARCHAR2(255),
                descricao CLOB
            )
        `);

        // Criar a tabela palestrantes se ela não existir
        await connection.execute(`
            CREATE TABLE palestrantes (
                id NUMBER PRIMARY KEY,
                foto VARCHAR2(255),
                nome VARCHAR2(255),
                empresa VARCHAR2(255),
                cargo VARCHAR2(255)
            )
        `);

        // Criar a tabela eventos_palestrantes se ela não existir
        await connection.execute(`
            CREATE TABLE eventos_palestrantes (
                id NUMBER PRIMARY KEY,
                palestrante_id NUMBER,
                id_evento NUMBER
            )
        `);

        // Inserir os dados dos eventos na tabela eventos
        const eventoStmt = await connection.prepare(`
            INSERT INTO eventos (id, hora, data, conferencia, durancao, titulo, descricao) VALUES (:id, :hora, :data, :conferencia, :durancao, :titulo, :descricao)
        `);
        for (const evento of eventos) {
            await connection.execute(eventoStmt, evento);
        }

        // Inserir os dados dos palestrantes na tabela palestrantes
        const palestranteStmt = await connection.prepare(`
            INSERT INTO palestrantes (id, foto, nome, empresa, cargo) VALUES (:id, :foto, :nome, :empresa, :cargo)
        `);
        for (const palestrante of palestrantes) {
            await connection.execute(palestranteStmt, palestrante);
        }

        // Inserir os dados dos eventos_palestrantes na tabela eventos_palestrantes
        const eventoPalestranteStmt = await connection.prepare(`
            INSERT INTO eventos_palestrantes (id, palestrante_id, id_evento) VALUES (:id, :palestrante_id, :id_evento)
        `);
        for (const eventoPalestrante of eventos_palestrantes) {
            await connection.execute(eventoPalestranteStmt, eventoPalestrante);
        }

        // Commitar as transações
        await connection.commit();
        console.log('Dados inseridos com sucesso.');

    } catch (err) {
        console.error('Erro:', err);
    } finally {
        if (connection) {
            try {
                await connection.close();
                console.log('Conexão com o banco de dados fechada.');
            } catch (err) {
                console.error('Erro ao fechar a conexão com o banco de dados:', err);
            }
        }
    }
})();