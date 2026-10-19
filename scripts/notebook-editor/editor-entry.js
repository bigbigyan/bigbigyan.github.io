import { Crepe } from '@milkdown/crepe';
import '@milkdown/crepe/theme/common/style.css';
import '@milkdown/crepe/theme/frame.css';

async function uploadImage(file) {
  if (!['image/png', 'image/jpeg', 'image/webp', 'image/gif'].includes(file.type)) throw new Error('请选择 PNG、JPEG、WebP 或 GIF 图片。');
  if (file.size > 150 * 1024) throw new Error('图片请压缩至 150 KB 以内，或使用图片链接。');
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
export async function mount(root, markdown, onChange) {
  const editor = new Crepe({
    root, defaultValue: markdown,
    features: { [Crepe.Feature.AI]: false, [Crepe.Feature.TopBar]: false },
    featureConfigs: {
      [Crepe.Feature.Latex]: { katexOptions: { trust: false, throwOnError: false, maxExpand: 1000 } },
      [Crepe.Feature.ImageBlock]: { onUpload: uploadImage, inlineOnUpload: uploadImage, blockOnUpload: uploadImage },
      [Crepe.Feature.Placeholder]: { text: '写下你的理解，输入 / 插入内容…' },
    },
  });
  let ready = false;
  editor.on(listener => listener.markdownUpdated((_ctx, value, previous) => {
    if (ready && value !== previous) onChange(value);
  }));
  await editor.create();
  ready = true;
  return editor;
}
