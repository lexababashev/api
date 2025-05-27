start-localstack:
	docker run -d --rm -it -p 4566:4566 --name celebration-localstack localstack/localstack:s3-latest

# Install AWS CLI inside LocalStack container
install-aws-cli:
	docker exec -it celebration-localstack bash -c "apt-get update && apt-get install -y python3-pip && pip3 install --no-cache-dir awscli"

# Execute bash in LocalStack container
exec-localstack:
	docker exec -it celebration-localstack bash

configure-aws:
	docker exec -it celebration-localstack bash -c "aws configure set aws_access_key_id test --profile default && \
	aws configure set aws_secret_access_key test --profile default && \
	aws configure set region us-east-1 --profile default && \
	aws configure set output json --profile default"

create-bucket:
	docker exec -it celebration-localstack bash -c "aws --endpoint-url=http://localhost:4566 s3api create-bucket --bucket invitees-videos && \
    aws --endpoint-url=http://localhost:4566 s3api create-bucket --bucket compiled-videos

configure-cors:
	docker exec -it celebration-localstack bash -c "echo '{\"CORSRules\": [{\"AllowedOrigins\": [\"http://localhost:3000\"], \"AllowedMethods\": [\"GET\", \"POST\", \"DELETE\"], \"AllowedHeaders\": [\"*\"], \"ExposeHeaders\": [\"ETag\"]}]}' > /tmp/cors-config.json && \
	aws --endpoint-url=http://localhost:4566 s3api put-bucket-cors --bucket invitees-videos --cors-configuration file:///tmp/cors-config.json"

configure-compiled-cors:
	docker exec -it celebration-localstack bash -c "echo '{\"CORSRules\": [{\"AllowedOrigins\": [\"http://localhost:3000\"], \"AllowedMethods\": [\"GET\", \"POST\", \"DELETE\"], \"AllowedHeaders\": [\"*\"], \"ExposeHeaders\": [\"ETag\"]}]}' > /tmp/compiled-cors-config.json && \
	aws --endpoint-url=http://localhost:4566 s3api put-bucket-cors --bucket compiled-videos --cors-configuration file:///tmp/compiled-cors-config.json"

setup-localstack-s3: start-localstack install-aws-cli configure-aws create-bucket configure-cors configure-compiled-cors
