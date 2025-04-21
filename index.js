const express = require('express');
const cors = require('cors');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const createReport = require('docx-templates').default;

const app = express();
const upload = multer({ dest: 'uploads/' });

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

function getCurrentDateFormatted() {
    const today = new Date();
    const day = String(today.getDate()).padStart(2, '0');
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const year = today.getFullYear();
    return `${day}/${month}/${year}`;
}

app.post('/generate', upload.single('template'), async (req, res) => {
    if (!req.file) return res.status(400).send('Nenhum arquivo foi enviado');

    const { nome, descricao } = req.body;
    const templatePath = req.file.path;

    try {
        const template = fs.readFileSync(templatePath);

        const buffer = await createReport({
            template: template,
            data: {
                nome,
                descricao,
                data: getCurrentDateFormatted()
            },
            noSandbox: true,
            cmdDelimiter: ['{{', '}}'],
        });

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
        res.setHeader('Content-Disposition', 'attachment; filename=documento-preenchido.docx');
        res.send(buffer);
    } catch (err) {
        console.error('Erro ao gerar documento:', err);
        res.status(500).send('Erro ao gerar documento');
    } finally {
        fs.unlinkSync(templatePath);
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`);
});