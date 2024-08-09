const fs = require('fs');
const cheerio = require('cheerio');

(async () => {
    const dates = ['13', '14', '15', '16'].slice(0, 1)

    const output = dates.map(date => {
        const data = `2024-8-${date}`
        const html = fs.readFileSync(`./paginas/${date}.html`, 'utf8')
        const $ = cheerio.load(html)
        const divs = $('.MuiGrid-direction-xs-column > div').children().toArray().map(div => {
            const id = $(div).attr('id')
            const hora = id.startsWith('timeslotDivider') ? $(div).find('p').text() : null
            const conferencia = $(div).find('div > div > div > div > div.MuiBox-root.jss77 > span > span').text()
            const durancao = $(div).find('div > div > div > div > div.MuiBox-root.jss77 > div > span > span').text().trim()
            const titulo = $(div).find('#Timeslot__title--opening-night').text()
            const descricao = $(div).find('div > div > div > div > p').html()
            const palestrantes = $(div).find('div > div > div > div > div.MuiGrid-container > div.MuiGrid-container').toArray().map(palestranteItem => {
                const foto = $(palestranteItem).find('img').attr('src')
                const nome = $(palestranteItem).find('p').first().text()
                const empresaCargo = $(palestranteItem).find('p span').last().html()
                const [empresa, cargo] = empresaCargo.split('<br>').map(item => item.trim())

                return {
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
        },  {}).items

        return aplicahora
    }).flat()

    fs.writeFileSync('./saida/completo.json', JSON.stringify(output, null, 2))

    console.log('Finalizado!')
})()