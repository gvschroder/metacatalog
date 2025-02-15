const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3000;

// Servir arquivos estáticos
app.use(express.static(path.join(__dirname, 'public')));

// Caminho da pasta de metadados
const metadadosPath = path.join(__dirname, 'views', 'metadados');

// Função para listar categorias e contagem de arquivos
const getCatalogs = () => {
    const catalogs = [];
    if (fs.existsSync(metadadosPath)) {
        fs.readdirSync(metadadosPath).forEach(folder => {
            const folderPath = path.join(metadadosPath, folder);
            if (fs.lstatSync(folderPath).isDirectory()) {
                const subfolders = fs.readdirSync(folderPath).filter(sub => 
                    fs.lstatSync(path.join(folderPath, sub)).isDirectory()
                );
                catalogs.push({ name: folder, count: subfolders.length });
            }
        });
    }
    return catalogs;
};

// Função para listar arquivos dentro de uma categoria
const getSchemas = (catalog) => {
    const schemaPath = path.join(metadadosPath, catalog);
    if (fs.existsSync(schemaPath) && fs.lstatSync(schemaPath).isDirectory()) {
        const subfolders = fs.readdirSync(schemaPath)
            .filter(sub => fs.lstatSync(path.join(schemaPath, sub)).isDirectory());
        return subfolders.map(sub => ({ 
            name: sub, 
            count: fs.readdirSync(path.join(schemaPath, sub)).filter(file => file.endsWith('.html')).length
        }));
    }
    return [];
};

const getTables = (catalog, schema) => {
    const tablePath = path.join(metadadosPath, catalog, schema);
    if (fs.existsSync(tablePath) && fs.lstatSync(tablePath).isDirectory()) {
        return fs.readdirSync(tablePath)
            .filter(file => file.endsWith('.html'))
            .map(file => file.replace('.html', ''));
    }            
    return [];
};

// Função para renderizar páginas dinâmicas
const renderPage = (res, breadcrumb, title, content, visibility='') => {
    fs.readFile(path.join(__dirname, 'views', 'layout.html'), 'utf8', (err, layout) => {
        if (err) {
            res.status(500).send('Erro ao carregar o layout');
            return;
        }

        const renderedPage = layout
            .replace('{{ title }}', title)
            .replace('{{ breadcrumb }}', breadcrumb)
            .replace('{{ content }}', content)
            .replace('{{ visibility }}', visibility);

        res.send(renderedPage);
    });
};

// Rota Home - Lista todas as categorias
app.get('/', (req, res) => {
    const catalogs = getCatalogs();
    let content = '<h2>Catálogos</h2>'
    content += '<ul class="catalog">';
    catalogs.forEach(cat => {
        content += `<li><a href="/metadados/${cat.name}">${cat.name} (${cat.count})</a></li>`;
    });
    content += '</ul>';
    renderPage(res, '&nbsp;', 'Catálogos', content);
});

// Rota Categoria - Lista os schemas
app.get('/metadados/:catalog', (req, res) => {
    const catalog = req.params.catalog;
    const schemas = getSchemas(catalog);

    if (schemas.length === 0) {
        res.status(404).send('Catálogo não encontrado ou vazio.');
        return;
    }

    let content = `<h2>Schemas</h2>`
    content += '<ul class="catalog">';
    schemas.forEach(sch => {
        content += `<li><a href="/metadados/${catalog}/${sch.name}">${sch.name} (${sch.count})</a></li>`;
    });
    content += '</ul>';
    renderPage(res, `<a href="/">Catálogos</a> > ${catalog}`, 'Schemas',content);
});

// Rota Categoria - Lista os schemas
app.get('/metadados/:catalog/:schema', (req, res) => {
    const catalog = req.params.catalog;
    const schema = req.params.schema;
    const tables = getTables(catalog, schema);

    if (tables.length === 0) {
        res.status(404).send('Catálogo não encontrado ou vazio.');
        return;
    }

    let content = `<h2>Tabelas</h2>`
    content += '<ul class="catalog">';
    tables.forEach(tbl => {
        content += `<li><a href="/metadados/${catalog}/${schema}/${tbl}">${tbl}</a></li>`;
    });
    content += '</ul>';
    renderPage(
        res, 
        `<a href="/">Catálogos</a> > <a href="/metadados/${catalog}">${catalog}</a> > ${schema}`, 
        'Tabelas',
        content
    );
});

// Rota Arquivo - Renderiza a página específica do arquivo
app.get('/metadados/:catalog/:schema/:arquivo', (req, res) => {
    const catalog = req.params.catalog;
    const schema = req.params.schema;
    const arquivo = req.params.arquivo;
    const filePath = path.join(metadadosPath, catalog, schema, `${arquivo}.html`);

    if (!fs.existsSync(filePath)) {
        res.status(404).send('Arquivo não encontrado.');
        return;
    }

    fs.readFile(filePath, 'utf8', (err, content) => {
        if (err) {
            res.status(500).send('Erro ao carregar a página');
            return;
        }
        renderPage(
            res, 
            `<a href="/">Catálogos</a> > <a href="/metadados/${catalog}">${catalog}</a> > <a href="/metadados/${catalog}/${schema}">${schema}</a> > ${arquivo}`, 
            `Metadado - ${arquivo}`,
            content,
            'class="hidden"'
        );
    });
});

app.get('/search', (req, res) => {
    const query = req.query.q?.toLowerCase().trim();
    if (!query) {
        return renderPage(res, 'Busca', 'Busca', '<p class="not_found">Nenhum termo foi informado.</p>');
    }
    
    let results = [];
    if (!fs.existsSync(metadadosPath)) {
        return renderPage(res, 'Busca', 'Busca', '<p class="not_found">Nenhum resultado encontrado.</p>');
    }

    const catalogs = fs.readdirSync(metadadosPath);
    
    catalogs.forEach(catalog => {
        const catalogPath = path.join(metadadosPath, catalog);
        if (!fs.lstatSync(catalogPath).isDirectory()) return;

        fs.readdirSync(catalogPath).forEach(schema => {
            const schemaPath = path.join(catalogPath, schema);
            if (!fs.lstatSync(schemaPath).isDirectory()) return;

            fs.readdirSync(schemaPath)
                .filter(file => file.endsWith('.html'))
                .forEach(file => {
                    const filePath = path.join(schemaPath, file);
                    try {
                        const content_search = fs.readFileSync(filePath, 'utf-8');
                        const lowerContent = content_search.toLowerCase();
                        const count = (lowerContent.match(new RegExp(query, 'gi')) || []).length;
                        
                        if (count > 0 || file.includes(query)) {
                            results.push({
                                catalog,
                                schema,
                                table: file.replace('.html', ''),
                                url: `/metadados/${catalog}/${schema}/${file.replace('.html', '')}`,
                                count
                            });
                        }
                    } catch (error) {
                        console.error(`Erro ao ler o arquivo: ${filePath}`, error);
                    }
                });
        });
    });
    
    const content = results.length
        ? `<h2>Resultado da Busca</h2><ul class='search_results'>${results.map(r => `<li><a target="_blank" href="${r.url}">${r.catalog}.${r.schema}.${r.table}</a><br><span class='count'>Total de ocorrências: ${r.count}</span></li>`).join('')}</ul>`
        : '<p class="not_found">Nenhum resultado encontrado.</p>';

    renderPage(res, 'Busca', 'Busca', content);
});

// Inicia o servidor
app.listen(PORT, () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`);
});