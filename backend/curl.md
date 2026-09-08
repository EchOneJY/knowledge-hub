curl -s -X POST http://localhost:3000/documents/upload/parse \
-F 'file=@./test-files/申论总结课.pptx' \
-F 'authorId=10001' \
-F 'createBy=10001' | jq

DOC_ID='341147305778352128'
curl -s "http://localhost:3000/documents/${DOC_ID}" | jq
