import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.example.app',
  appName: 'shiyoujiliang5',
  webDir: 'dist',
  android: {
    // 可选：指定图标路径，如果不指定则使用默认图标
    // 如果你有自定义图标，确保路径正确且文件有效
    icon: 'app-icon.png', // 如果文件不存在或损坏，就会报错
  },
  // 或者直接删除 android.icon 配置，使用默认图标
};

export default config;