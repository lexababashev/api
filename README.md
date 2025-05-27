# This is a backend for celebration app

The app uses [bun](https://bun.sh/). It has a few componenets as dependencies: Postgres, LocalStack.

## Before you start the work

```sh
bun install
```

To run the tests, execute the following command:
```sh
bun test
```

## Semi-manual local dev environment

When the services (Postgres, S3) are up and running, you can start the local development of the app using:
```sh
bun run dev
```

### Useful S3 Commands

To connect to the running LocalStack container:
```sh
docker exec -it celebration-s3 bash
```

Inside the container, you can use these commands:
- `aws --endpoint-url=http://localhost:4566 s3api list-objects --bucket invitees-videos` — list the items in the `invitees-videos` bucket
- `aws --endpoint-url=http://localhost:4566 s3api delete-objects --bucket invitees-videos --delete "{\"objects\": $(aws --endpoint-url=http://localhost:4566 s3api list-objects --bucket invitees-videos --query 'Contents[].{Key: Key}' --output json)}"` — delete all objects in the `invitees-videos` bucket