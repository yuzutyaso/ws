const express = require('express');
const { spawn } = require('child_process');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static('public'));

app.get('/', (req, res) => {
    res.render('index', { url: req.query.url || '' });
});

// ダウンロード処理
app.get('/download', (req, res) => {
    const { url, format } = req.query;

    if (!url || !format) {
        return res.status(400).send('動画のURLとフォーマットを指定してください。');
    }

    const options = [url, '-o', '-'];
    
    if (format === 'mp4') {
        options.push('-f', 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]');
    } else if (format === 'mp3') {
        options.push('-f', 'bestaudio', '-x', '--audio-format', 'mp3');
    } else {
        return res.status(400).send('無効なフォーマットです。mp4またはmp3を指定してください。');
    }

    const ytdlp = spawn('yt-dlp', options);

    // yt-dlpプロセスのエラーをキャッチ
    ytdlp.on('error', (err) => {
        console.error('yt-dlp failed to start:', err);
        if (!res.headersSent) {
            res.status(500).send('yt-dlpの実行に失敗しました。');
        }
    });

    // 標準出力ストリームでデータをパイプ
    ytdlp.stdout.pipe(res);

    // 標準エラー出力ストリームでエラーをキャッチ
    ytdlp.stderr.on('data', (data) => {
        console.error(`yt-dlp stderr: ${data}`);
    });
    
    // プロセス終了時の処理
    ytdlp.on('close', (code) => {
        if (code !== 0 && !res.headersSent) {
            console.error(`yt-dlp exited with code ${code}`);
            res.status(500).send(`ダウンロード中にエラーが発生しました。終了コード: ${code}`);
        } else if (!res.headersSent) {
            // ヘッダーを送信
            res.setHeader('Content-Type', format === 'mp3' ? 'audio/mpeg' : 'video/mp4');
            res.setHeader('Content-Disposition', `attachment; filename="youtube.${format}"`);
        }
    });
});

app.listen(port, () => {
    console.log(`サーバーがポート ${port} で起動しました。`);
});
