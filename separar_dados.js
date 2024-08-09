const fs = require('fs');

// Caminho do arquivo de entrada
const inputFile = './saida/completo.json';

// Lê o arquivo de entrada
fs.readFile(inputFile, 'utf8', (err, data) => {
    if (err) {
        console.error('Erro ao ler o arquivo:', err);
        return;
    }

    try {
        // Converte o conteúdo do arquivo para um objeto JavaScript
        const jsonData = JSON.parse(data);

        let total = 0;

        // Filtra os palestrantes
        const palestrantesMap = jsonData.map(item => item.palestrantes).flat().reduce((acc, palestrante) => {
            const { nome, empresa } = palestrante;
            const key = `${nome} - ${empresa}`;
            if (!acc[key]) {
                total++;
                acc[key] = palestrante;
                acc[key].id = total;
            }
            return acc;
        }, {});

        const palestrantes = Object.values(palestrantesMap)

        const conferencias = jsonData.map((item, index) => {
            const palestrantes2 = item.palestrantes.map(palestrante => {
                const { nome, empresa } = palestrante;
                const key = `${nome} - ${empresa}`;
                return palestrantesMap[key].id;
            });
    
            item.id = index + 1
            item.palestrantes = palestrantes2;

            return item
        });

        const eventos_palestrantes = conferencias.map(evento => {
            return evento.palestrantes.map(palestrante_id => {
                return {
                    palestrante_id,
                    id_evento: evento.id
                }
            })
        }).flat().map((item, index) => {
            return {
                id: index + 1,
                ...item
            };
        });

        const eventos = conferencias.map(({ palestrantes, ...evento }) => evento);

        // Save o arquivo de saída
        fs.writeFileSync('./saida/eventos.json', JSON.stringify(eventos, null, 2));
        fs.writeFileSync('./saida/palestrantes.json', JSON.stringify(palestrantes, null, 2));
        fs.writeFileSync('./saida/eventos_palestrantes.json', JSON.stringify(eventos_palestrantes, null, 2));

        const saidas = {
            eventos,
            palestrantes,
            eventos_palestrantes
        }

        const sqlInstructs = Object.entries(saidas).map(([key, value]) => {
            console.log(`Arquivo ${key}.json criado com sucesso!`);

            // Retorna uma instrução SQL para inserir o item no banco de dados tratando as aspas simples
            const insertSQL = value.map(item => {
                const values = Object.values(item).map(value => {
                    if (typeof value === 'string') {
                        return `'${value.replace(/'/g, "''")}'`;
                    }
                    return value;
                });
                return `INSERT INTO ${key} (${Object.keys(item).join(', ')}) VALUES (${values.join(', ')});`;
            });

            return insertSQL;
        }).flat();

        fs.writeFileSync('./saida/inserts.sql', sqlInstructs.join('\n'));

        // Imprime a quantidade de palestrantes e conferências
        console.log('Palestrantes:', palestrantes.length);
        console.log('Conferências:', eventos.length);
        console.log('Relação eventos/palestrantes:', eventos_palestrantes.length);

        console.log('Finalizado!');

    } catch (error) {
        console.error('Erro ao processar o arquivo JSON:', error);
    }
});