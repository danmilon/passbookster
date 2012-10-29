
test:
	./node_modules/.bin/mocha -t 2000 $$(find test -name *.js) -R list

.PHONY: test
