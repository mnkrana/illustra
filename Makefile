.PHONY: run run-ui test test-a2a deploy deploy-ui clean

run:
	cd agent && bun src/main.ts

run-ui:
	cd ui && PORT=3000 bun src/index.ts

test:
	bash scripts/test.sh

test-a2a:
	bash scripts/test-a2a.sh

deploy:
	cd agent && gcloud run deploy illustra-agent \
		--source . \
		--region asia-south1 \
		--port 8080 \
		--env-vars-file env.yaml \
		--allow-unauthenticated

deploy-ui:
	cd ui && gcloud run deploy illustra-ui \
		--source . \
		--region asia-south1 \
		--env-vars-file env.yaml \
		--allow-unauthenticated

clean:
	rm -rf agent/node_modules ui/node_modules node_modules
