require('dotenv').config();

const { Client, GatewayIntentBits } = require('discord.js');
const Tesseract = require('tesseract.js');
const axios = require('axios');
const sharp = require('sharp');
const fs = require('fs');

// Discord botのトークンを設定
const BOT_TOKEN = process.env.DISCORD_AMOUNT_EXTRACTOR_TOKEN;

// botクライアントを作成
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

// 画像前処理関数
const preprocessImage = async (imageBuffer) => {
    try {
        // Sharpを使用して画像を最適化
        const processedBuffer = await sharp(imageBuffer)
            .extract({ left: 500, top: 300, width: 280, height: 200 }) // 必要に応じて調整
            .greyscale() // グレースケール変換
            .normalize() // コントラスト正規化
            .sharpen() // シャープネス向上
            .png({ quality: 100 }) // 高品質PNG出力
            .toBuffer();
        // トリミング後の画像を保存
        fs.writeFileSync('trimmed_output.png', processedBuffer);
        return processedBuffer;
    } catch (error) {
        console.error('画像前処理エラー:', error);
        return imageBuffer; // 前処理に失敗した場合は元の画像を使用
    }
};

// botが起動したときの処理
client.once('ready', () => {
    console.log(`${client.user.tag} でログインしました！`);
});

// メッセージを受信したときの処理
client.on('messageCreate', async (message) => {
    if (message.author.bot) return;

    // 画像の添付ファイルがあるかチェック
    if (message.attachments.size > 0) {
        const attachment = message.attachments.first();
        
        if (attachment.contentType && attachment.contentType.startsWith('image/')) {
            try {
                const processingMessage = await message.reply('🔍 画像を高精度で解析中です...');

                // 画像をダウンロード
                const response = await axios.get(attachment.url, {
                    responseType: 'arraybuffer'
                });

                // 画像前処理
                const originalBuffer = Buffer.from(response.data);
                const processedBuffer = await preprocessImage(originalBuffer);

                // 複数の設定でOCRを実行
                const ocrConfigs = [
                    {
                        lang: 'jpn+eng',
                        config: {
                            tessedit_pageseg_mode: Tesseract.PSM.SINGLE_BLOCK,
                            tessedit_char_whitelist: '0123456789,円ご利用金額合計',
                            tessedit_ocr_engine_mode: Tesseract.OEM.LSTM_ONLY,
                            preserve_interword_spaces: '1'
                        }
                    },
                    {
                        lang: 'jpn',
                        config: {
                            tessedit_pageseg_mode: Tesseract.PSM.AUTO,
                            tessedit_ocr_engine_mode: Tesseract.OEM.LSTM_ONLY
                        }
                    },
                    {
                        lang: 'eng',
                        config: {
                            tessedit_pageseg_mode: Tesseract.PSM.SINGLE_BLOCK,
                            tessedit_char_whitelist: '0123456789,¥'
                        }
                    }
                ];

                let extractedAmount = null;
                let ocrResults = [];

                // 各設定でOCRを試行
                for (const config of ocrConfigs) {
                    try {
                        const { data: { text } } = await Tesseract.recognize(
                            processedBuffer,
                            config.lang,
                            {
                                logger: m => console.log(`[${config.lang}] ${m.status}: ${m.progress}`),
                                ...config.config
                            }
                        );

                        ocrResults.push({
                            lang: config.lang,
                            text: text,
                            amount: extractAmount(text)
                        });

                        console.log(`[${config.lang}] OCR結果:`, text);
                        
                        if (!extractedAmount) {
                            extractedAmount = extractAmount(text);
                        }
                        
                        if (extractedAmount) break; // 金額が見つかったら終了
                    } catch (ocrError) {
                        console.error(`OCR設定 ${config.lang} でエラー:`, ocrError);
                    }
                }

                // 結果をまとめて表示
                if (extractedAmount) {
                    const amount = extractedAmount;
                    const halfAmount = Math.floor(amount / 2);
                    
                    await processingMessage.edit({
                        content: `💰 **金額抽出結果**\n` +
                                `ご利用金額合計: ${amount.toLocaleString()}円\n` +
                                `半額: ${halfAmount.toLocaleString()}円\n` +
                                `⚠️金額が正しいことを確認してください\n\n` +
                                `↓コピー用金額`
                    });
                    // 2つ目のメッセージとして半額の整数値（点なし）を送信
                    await message.channel.send(`${halfAmount}`);
                } else {
                    // デバッグ情報を含む失敗メッセージ
                    let debugInfo = '**デバッグ情報:**\n';
                    ocrResults.forEach((result, index) => {
                        debugInfo += `${index + 1}. ${result.lang}: ${result.text.substring(0, 100)}...\n`;
                    });

                    await processingMessage.edit({
                        content: `❌ 金額を抽出できませんでした。\n\n` +
                                `**改善提案:**\n` +
                                `• 画像の解像度を上げる\n` +
                                `• 文字が鮮明に見える部分をトリミングする\n` +
                                `• 明るさやコントラストを調整する\n\n` +
                                debugInfo
                    });
                }

            } catch (error) {
                console.error('画像処理エラー:', error);
                await message.reply('画像の処理中にエラーが発生しました。画像形式やサイズを確認してください。');
            }
        }
    }

    // ヘルプコマンド
    if (message.content === '!help' || message.content === '!ヘルプ') {
        const helpEmbed = {
            color: 0x0099FF,
            title: '💰 高精度金額抽出Bot',
            description: 'スクリーンショットから利用金額を高精度で抽出し、半額を計算します。',
            fields: [
                {
                    name: '🔍 高精度機能',
                    value: '• 画像の自動前処理\n• 複数OCR設定での並列処理\n• 日本語・英語の混合認識',
                    inline: false
                },
                {
                    name: '📷 推奨画像条件',
                    value: '• 高解像度 (1000px以上)\n• 文字が鮮明\n• 十分な明るさ',
                    inline: true
                },
                {
                    name: '🎯 対応形式',
                    value: 'PNG, JPG, JPEG, GIF',
                    inline: true
                }
            ],
            timestamp: new Date(),
            footer: {
                text: '高精度金額抽出Bot v2.0'
            }
        };

        await message.reply({ embeds: [helpEmbed] });
    }
});

// 金額抽出関数（改良版）
const extractAmount = (text) => {
    console.log('抽出対象テキスト:', text);
    
    // テキストを正規化
    const normalizedText = text
        .replace(/[０-９]/g, (s) => String.fromCharCode(s.charCodeAt(0) - 0xFEE0)) // 全角数字を半角に
        .replace(/，/g, ',') // 全角カンマを半角に
        .replace(/￥/g, '円') // 円マークを統一
        .replace(/[.,．・●●・]/g, '') // ピリオドや点を除去
        .replace(/\s+/g, '') // 空白を除去
        ;
    console.log('正規化後:', normalizedText);

    // 全ての金額候補を抽出
    const allAmounts = normalizedText.match(/\d{1,6}/g);
    if (allAmounts && allAmounts.length > 0) {
        // 数値配列に変換
        const nums = allAmounts.map(s => parseInt(s, 10)).filter(n => !isNaN(n));
        // 1000円未満の小さい数字（回数や日付など）を除外
        const filtered = nums.filter(n => n >= 1000);
        // 最大値を返す
        if (filtered.length > 0) {
            return Math.max(...filtered);
        }
        return Math.max(...nums);
    }
    return null;
};

// botをログイン
client.login(BOT_TOKEN);

// エラーハンドリング
process.on('unhandledRejection', error => {
    console.error('未処理のPromise拒否:', error);
});

client.on('error', error => {
    console.error('Discord.js エラー:', error);
});