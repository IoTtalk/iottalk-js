export default class {
  constructor() {
    this.table = {};
    this.rtable = {};
  }

  add(DFName, topic) {
    this.table[DFName] = topic;
    this.rtable[topic] = DFName;
  }

  topic(DFName) {
    return this.table[DFName];
  }

  removeDF(DFName) {
    delete this.rtable[this.table[DFName]];
    delete this.table[DFName];
  }

  removeAllDF() {
    this.rtable = {};
    this.table = {};
  }

  df(topic) {
    return this.rtable[topic];
  }
}
