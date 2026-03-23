// 模拟Firebase实时数据库
class MockFirebase {
  private data: any = {};
  private listeners: any = {};

  constructor() {
    // 从localStorage加载数据
    const saved = localStorage.getItem('mock_firebase_data');
    if (saved) {
      try {
        this.data = JSON.parse(saved);
      } catch (e) {
        this.data = {};
      }
    }
  }

  private saveData() {
    localStorage.setItem('mock_firebase_data', JSON.stringify(this.data));
  }

  // 监听数据变化
  on(path: string, callback: (data: any) => void) {
    if (!this.listeners[path]) {
      this.listeners[path] = [];
    }
    this.listeners[path].push(callback);

    // 立即触发一次回调
    const data = this.getData(path);
    callback(data);

    // 返回取消监听的函数
    return () => {
      this.listeners[path] = this.listeners[path].filter((cb: any) => cb !== callback);
    };
  }

  // 获取数据
  getData(path: string) {
    const parts = path.split('/').filter(p => p);
    let current = this.data;
    for (const part of parts) {
      if (!current[part]) {
        return null;
      }
      current = current[part];
    }
    return current;
  }

  // 设置数据
  setData(path: string, data: any) {
    const parts = path.split('/').filter(p => p);
    let current = this.data;
    
    // 遍历路径，创建不存在的节点
    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      if (!current[part]) {
        current[part] = {};
      }
      current = current[part];
    }

    // 设置最终节点的值
    current[parts[parts.length - 1]] = data;
    this.saveData();

    // 触发监听器
    this.triggerListeners(path, data);
  }

  // 触发监听器
  private triggerListeners(path: string, data: any) {
    if (this.listeners[path]) {
      this.listeners[path].forEach((callback: any) => {
        callback(data);
      });
    }

    // 触发父路径的监听器
    const parentPath = path.split('/').slice(0, -1).join('/');
    if (parentPath) {
      const parentData = this.getData(parentPath);
      this.triggerListeners(parentPath, parentData);
    }
  }

  // 推送数据（用于数组）
  push(path: string, data: any) {
    const id = Date.now().toString();
    const newPath = `${path}/${id}`;
    this.setData(newPath, { ...data, id });
    return id;
  }

  // 删除数据
  remove(path: string) {
    const parts = path.split('/').filter(p => p);
    let current = this.data;
    
    // 遍历路径，找到父节点
    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      if (!current[part]) {
        return;
      }
      current = current[part];
    }

    // 删除节点
    delete current[parts[parts.length - 1]];
    this.saveData();

    // 触发监听器
    this.triggerListeners(path, null);
  }
}

// 导出单例实例
export const firebase = new MockFirebase();
export default firebase;