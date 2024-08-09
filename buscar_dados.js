const fs = require('fs');
const cheerio = require('cheerio');
const Queue = require('bee-queue');
const axios = require('axios');

(async () => {
    const dates = ['13', '14', '15', '16']

    // Lê os arquivos HTML e extrai os dados
    const output = dates.map(date => {
        const data = `2024-8-${date}`
        const html = fs.readFileSync(`./paginas/${date}.html`, 'utf8')
        const $ = cheerio.load(html)
        const divs = $('.MuiGrid-direction-xs-column > div').children().toArray().map(div => {
            const id = $(div).attr('id')
            const hora = id.startsWith('timeslotDivider') ? $(div).find('p').text() : null
            let conferencia = $(div).find('div > div > div > div > div.MuiBox-root.jss77 > span > span').text()
            if (conferencia) {
                conferencia = conferencia.split('\n')[0]

                if (conferencia.indexOf(' - ') === conferencia.length - 3) {
                    conferencia = conferencia.slice(0, -3)
                }
            }

            const durancao = $(div).find('div > div > div > div > div.MuiBox-root.jss77 > div > span > span').text().trim()
            const titulo = $(div).find('#Timeslot__title--opening-night').text()
            let descricao = $(div).find('div > div > div > div > p').html()
            if (descricao) {
                descricao = descricao.split('&amp;').join('&')
            }

            const palestrantes = $(div).find('div > div > div > div > div.MuiGrid-container > div.MuiGrid-container').toArray().map(palestranteItem => {
                const id = $(palestranteItem).attr('onclick').split('\'')[1]
                const foto = $(palestranteItem).find('img').attr('src')
                const nome = $(palestranteItem).find('p').first().text()
                const empresaCargo = $(palestranteItem).find('p span').last().html()
                const [empresa, cargo] = empresaCargo.split('<br>').map(item => item.trim().split('&amp;').join('&'))

                return {
                    id,
                    foto,
                    nome,
                    empresa, cargo
                }
            })

            return {
                // id,
                hora,
                data,
                conferencia,
                durancao,
                titulo,
                descricao,
                palestrantes
            }
        })

        const aplicahora = divs.reduce((acc, item, index) => {
            if (item.hora) {
                acc.hora = item.hora
            } else {
                if (!acc.items) {
                    acc.items = []
                }

                acc.items.push({ ...item, hora: acc.hora })
            }
            return acc
        }, {}).items

        return aplicahora
    }).flat()

    // Cria uma lista de palestrantes únicos
    const palestrantesMap = output.map(item => item.palestrantes).flat().reduce((acc, palestrante) => {
        const { nome, empresa } = palestrante;
        const key = `${nome} - ${empresa}`;
        if (!acc[key]) {
            acc[key] = palestrante;
        }
        return acc;
    }, {});

    const palestrantes = Object.values(palestrantesMap)
    const palestrante_ids = palestrantes.map(palestrante => palestrante.id);

    // Faz uma requisição para buscar a bio do palestrante usando bee-queue
    const queue = new Queue('palestrantes');

    const fetchBio = async (id) => {
        const url = `https://rioinnovationweek.com.br/wp-content/plugins/palestrante-iux/includes/IUX-PALESTRANTE-site.php?id=${id}`
        const filename = `./paginas/palestrantes/${id}.html`;

        const loadOrFetch = async (id) => {
            if (fs.existsSync(filename)) {
                return fs.readFileSync(filename, 'utf8');
            }
            
            console.log(`Buscando bio do palestrante ${id}...`);

            const response = await axios.get(url);
            const html = await response.data;

            // Savar o arquivo para debug
            fs.writeFileSync(filename, html);
            return html;
        };

        try {
            const html = await loadOrFetch(id);
            const $ = cheerio.load(html);
            const bio = $('#scrollAreaBio > div > div > div > div').text().trim();
            const links = $('ul > li > a').toArray().map(a => ({
                url: $(a).attr('href'),
                nome: $(a).find('.btn_label').text().replace(' Page', '').replace(' page', '')
            }));
            return { id, bio, links };
        } catch (error) {
            if (fs.existsSync(filename)) {
                return fs.rmSync(filename);
            }
            console.log('Erro ao buscar bio do palestrante', id, error);
        }
    }

    palestrante_ids.forEach(id => {
        queue.createJob({ id }).save();
    });

    let bios = [];

    queue.on('succeeded', (job, result) => {
        const { id, bio } = result;
        console.log(`Bio do palestrante ${id} encontrada!`);
        bios.push(result);
    });

    queue.process(10, async (job) => {
        const { id } = job.data;
        const bio = await fetchBio(id);
        return bio;
    });

    // Aguarda o processamento de todas as requisições
    await new Promise((resolve) => {
        queue.on('succeeded', (job, result) => {
            if (bios.length === palestrante_ids.length) {
                resolve();
            }
        });
    });

    // Mapeaia as bios para os palestrantes
    const biosMap = bios.reduce((acc, bio) => {
        acc[bio.id] = bio;
        return acc;
    }, {});

    const final = output.map(item => {
        item.palestrantes = item.palestrantes.map(palestrante => {
            const { id, foto, nome, empresa, cargo } = palestrante;
            return {
                id,
                foto,
                nome,
                empresa,
                cargo,
                bio: biosMap[id].bio,
                links: biosMap[id].links
            };
        });
        return item
    });

    fs.writeFileSync('./saida/completo.json', JSON.stringify(final, null, 2))

    console.log('Finalizado!')
})()