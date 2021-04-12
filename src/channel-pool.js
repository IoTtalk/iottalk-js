export default class {
  constructor() {
    this.table = {};
    this.rtable = {};
  }

  add(dfName, topic) {
    this.table[dfName] = topic;
    this.rtable[topic] = dfName;
  }

  topic(dfName) {
    return this.table[dfName];
  }

  removeDF(dfName) {
    delete this.rtable[this.table[dfName]];
    delete this.table[dfName];
  }

  removeAllDF() {
    this.rtable = {};
    this.table = {};
  }

  df(topic) {
    return this.rtable[topic];
  }
}
