// One namespaced snapshot per application; storage errors remain observable.
export class JsonStore {
  constructor(storage, key, validate = () => true) {
    this.storage = storage;
    if (!key) throw new Error('A storage key is required');
    this.key = key;
    this.validate = validate;
  }

  load(fallback) {
    const raw = this.storage.get(this.key);
    if (raw === '' || raw == null) return structuredFallback(fallback);
    const value = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (!this.validate(value)) {
      throw new Error('存档格式不受支持');
    }
    return value;
  }

  save(value) {
    if (!this.validate(value)) throw new Error('存档格式不受支持');
    this.storage.set(this.key, JSON.stringify(value));
  }
}

function structuredFallback(value) {
  return JSON.parse(JSON.stringify(value));
}
