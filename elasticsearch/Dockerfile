# 官方 ES 基础镜像
FROM docker.elastic.co/elasticsearch/elasticsearch:8.17.0

# 安装 IK 分词（版本严格和 ES 一致）
RUN elasticsearch-plugin install --batch \
    https://release.infinilabs.com/analysis-ik/stable/elasticsearch-analysis-ik-8.17.0.zip
