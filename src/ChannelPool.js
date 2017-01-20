export default class {

    constructor() {
        this.df_2_topic = {};
        this.topic_2_df = {};
    }

    add(df_name, topic) {
        this.df_2_topic[df_name] = topic;
        this.topic_2_df[topic] = df_name;
    }

    remove_df(df_name) {
        delete this.topic_2_df[this.df_2_topic[df_name]];
        delete this.df_2_topic[df_name];
    }

    topic(df_name) {
        return this.df_2_topic[df_name];
    }

    df(topic) {
        return this.topic_2_df[topic];
    }

}
