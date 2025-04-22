const express = require('express');
const cors = require('cors');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const createReport = require('docx-templates').default;
const ILovePDFApi = require('@ilovepdf/ilovepdf-nodejs');
const ILovePDFFile = require('@ilovepdf/ilovepdf-nodejs/ILovePDFFile');
const os = require('os');
require('dotenv').config();

const app = express();
const upload = multer({ dest: 'uploads/' });

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

const getCurrentDateFormatted = () => {
    const date = new Date();
    return date.toLocaleDateString('pt-BR');
};

const ilovepdf = new ILovePDFApi(process.env.PUBLIC_KEY, process.env.SECRET_KEY);

app.post('/generate', upload.single('template'), async (req, res) => {
    if (!req.file) return res.status(400).send('Nenhum arquivo foi enviado');

    const { nome, descricao } = req.body;
    let docxPath;
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'docx-'));
    docxPath = path.join(tmpDir, 'filled.docx');

    try {
        const template = fs.readFileSync(req.file.path);

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

        fs.writeFileSync(docxPath, buffer);

        const task = ilovepdf.newTask('officepdf');
        await task.start();
        await task.addFile(new ILovePDFFile(docxPath));
        await task.process();
        const pdfData = await task.download();

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename="documento.pdf"');
        res.send(pdfData);
    } catch (err) {
        console.error('Erro na geração/conversão:', err);
        res.status(500).send('Erro ao gerar documento');
    } finally {
        if (docxPath && fs.existsSync(docxPath)) {
            fs.unlinkSync(docxPath);
        }
        fs.unlinkSync(req.file.path);
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`);
});