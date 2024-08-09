const fs = require('fs');
const { AsyncDatabase } = require("promised-sqlite3");

// Abrir o banco de dados

const DB_PATH = "./saida/database.db"

fs.rmSync(DB_PATH, { force: true });

(async () => {
    try {
        // Create the AsyncDatabase object and open the database.
        const db = await AsyncDatabase.open(DB_PATH);

        // Access the inner sqlite3.Database object to use the API that is not exposed by AsyncDatabase.
        // db.inner.on("trace", (sql) => console.log("[TRACE]", sql));

        // Dividir as instruções em um array
        const eventos = JSON.parse(fs.readFileSync('./saida/eventos.json', 'utf8'));
        const palestrantes = JSON.parse(fs.readFileSync('./saida/palestrantes.json', 'utf8'));
        const eventos_palestrantes = JSON.parse(fs.readFileSync('./saida/eventos_palestrantes.json', 'utf8'));

        db.inner.serialize(() => {
            // Criar a tabela eventos se ela não existir
            db.inner.run(`CREATE TABLE IF NOT EXISTS eventos (
                id INT PRIMARY KEY,
                hora TEXT,
                data TEXT,
                conferencia TEXT,
                durancao TEXT,
                titulo TEXT,
                descricao TEXT
            )`);

            // Criar a tabela palestrantes se ela não existir
            db.inner.run(`CREATE TABLE IF NOT EXISTS palestrantes (
                id INT PRIMARY KEY,
                foto TEXT,
                nome TEXT,
                empresa TEXT,
                cargo TEXT
            )`);

            // Criar a tabela eventos_palestrantes se ela não existir
            db.inner.run(`CREATE TABLE IF NOT EXISTS eventos_palestrantes (
                id INT PRIMARY KEY,
                palestrante_id INT,
                id_evento INT
            )`);
        });

        // Salva no banco os registros
        db.inner.serialize(() => {
            const stmt = db.inner.prepare(`INSERT INTO eventos (id, hora, data, conferencia, durancao, titulo, descricao) VALUES (?, ?, ?, ?, ?, ?, ?)`);
            eventos.forEach(evento => {
                stmt.run(evento.id, evento.hora, evento.data, evento.conferencia, evento.durancao, evento.titulo, evento.descricao, (err) => {
                    if (err) {
                        console.error('Erro ao inserir dados:', err);
                    }
                });
            });
            stmt.finalize();

            const stmt2 = db.inner.prepare(`INSERT INTO palestrantes (id, foto, nome, empresa, cargo) VALUES (?, ?, ?, ?, ?)`);
            palestrantes.forEach(palestrante => {
                stmt2.run(palestrante.id, palestrante.foto, palestrante.nome, palestrante.empresa, palestrante.cargo, (err) => {
                    if (err) {
                        console.error('Erro ao inserir dados:', err);
                    }
                });
            });
            stmt2.finalize();

            const stmt3 = db.inner.prepare(`INSERT INTO eventos_palestrantes (id, palestrante_id, id_evento) VALUES (?, ?, ?)`);
            eventos_palestrantes.forEach(evento_palestrante => {
                stmt3.run(evento_palestrante.id, evento_palestrante.palestrante_id, evento_palestrante.id_evento, (err) => {
                    if (err) {
                        console.error('Erro ao inserir dados:', err);
                    }
                });
            });
            stmt3.finalize();

            console.log('Dados inseridos com sucesso.');
        });

        db.inner.serialize(() => {
            db.inner.each("SELECT * FROM eventos", (err, row) => {
                console.log(row);
            });

            db.inner.each("SELECT * FROM palestrantes", (err, row) => {
                console.log(row);
            });

            db.inner.each("SELECT * FROM eventos_palestrantes", (err, row) => {
                console.log(row);
            });
        });

        // Close the database.
        await db.close();
    } catch (err) {
        console.error(err);
    }
})();