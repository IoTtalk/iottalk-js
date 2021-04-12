export default class {
  constructor(props) {
    this._table = {};
    this._rtable = {};
  }

  add(df_name, topic_) {
    this._table[df_name] = topic_;
    this._rtable[topic_] = df_name;
  }

  topic(df_name) {
    return this._table[df_name];
  }

  remove_df(df_name) {
    delete this._rtable[this._table[df_name]];
    delete this._table[df_name];
  }

  remove_all_df() {
    this._rtable = {};
    this._table = {};
  }

  df(topic_) {
    return this._rtable[topic_];
  }
}
