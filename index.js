const express = require('express');
const ytsr = require('ytsr');
const { spawn } = require('child_process');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

// EJSをテンプレートエンジンとして設定
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// 静的ファイルを配信する設定（CSSなど）
app.use(express.static('public'));

// トップページ（検索フォーム）
app.get('/', (req, res) => {
    res.render('index', { results: null });
});

// 検索処理
app.get('/search', async (req, res) => {
    const { q } = req.query;

    if (!q) {
        return res.redirect('/');
    }

    try {
        const searchResults = await ytsr(q, { limit: 10 }); // 10件の検索結果を取得

        // ダウンロード可能な動画のみにフィルタリング
        const videos = searchResults.items.filter(item => item.type === 'video');

        res.render('index', { results: videos });
    } catch (error) {
        console.error(error);
        res.status(500).send('検索中にエラーが発生しました。');
    }
});

// ダウンロード処理
app.get('/download', (req, res) => {
    const { url, format } = req.query;

    if (!url || !format) {
        return res.status(400).send('動画のURLとフォーマットを指定してください。');
    }

    // yt-dlpのオプションを設定
    const options = [url, '-o', '-'];
    
    if (format === 'mp4') {
        // mp4動画としてダウンロード
        options.push('-f', 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]');
    } else if (format === 'mp3') {
        // mp3音声としてダウンロード
        options.push('-f', 'bestaudio', '-x', '--audio-format', 'mp3');
    }

    const ytdlp = spawn('yt-dlp', options, { stdio: ['ignore', 'pipe', 'inherit'] });

    // ダウンロードしたデータをストリーミング
    res.setHeader('Content-Type', format === 'mp3' ? 'audio/mpeg' : 'video/mp4');
    res.setHeader('Content-Disposition', `attachment; filename="youtube.${format}"`);

    ytdlp.stdout.pipe(res);

    ytdlp.on('close', (code) => {
        if (code !== 0) {
            console.error(`yt-dlp exited with code ${code}`);
        }
    });

    ytdlp.on('error', (err) => {
        console.error('yt-dlp failed to start.', err);
        res.status(500).send('yt-dlpの実行に失敗しました。');
    });
});

app.listen(port, () => {
    console.log(`サーバーがポート ${port} で起動しました。`);
});
