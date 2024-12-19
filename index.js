#!/usr/bin/env node
import fs from 'fs'
import path from 'path'
import {
	fileURLToPath
} from 'url'
import {
	select
} from '@inquirer/prompts'
import {
	createToken, Lexer, CstParser
} from 'chevrotain'
import Ajv from 'ajv'
import addFormats from 'ajv-formats'
import Handlebars from 'handlebars'
import {
	exec
} from 'child_process'

import {
	MongoClient
} from 'mongodb'

const uri = 'mongodb://localhost:27017'
const client = new MongoClient(uri)
await client.connect()
const db = client.db('protoschemaDB')

const servicesCollection = db.collection('services')
const messagesCollection = db.collection('messages')

await servicesCollection.deleteMany({
})
await messagesCollection.deleteMany({
})

Handlebars.registerHelper('json', function(context) {
	return JSON.stringify(context, null, 2)
})

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const ajv = new Ajv({
	allErrors: true,
	strict: false
})
addFormats(ajv)

const Comment = createToken({
	name: 'Comment',
	pattern: /\/\/[^\n]*/,
	group: Lexer.SKIPPED
})
const Service = createToken({
	name: 'Service',
	pattern: /service/
})
const Message = createToken({
	name: 'Message',
	pattern: /message/
})
const Rpc = createToken({
	name: 'Rpc',
	pattern: /rpc/
})
const Returns = createToken({
	name: 'Returns',
	pattern: /returns/
})
const Repeated = createToken({
	name: 'Repeated',
	pattern: /repeated/
})
const LCurly = createToken({
	name: 'LCurly',
	pattern: /{/
})
const RCurly = createToken({
	name: 'RCurly',
	pattern: /}/
})
const LParen = createToken({
	name: 'LParen',
	pattern: /\(/
})
const RParen = createToken({
	name: 'RParen',
	pattern: /\)/
})
const LBracket = createToken({
	name: 'LBracket',
	pattern: /\[/
})
const RBracket = createToken({
	name: 'RBracket',
	pattern: /\]/
})
const Semicolon = createToken({
	name: 'Semicolon',
	pattern: /;/
})
const Equals = createToken({
	name: 'Equals',
	pattern: /=/
})
const Comma = createToken({
	name: 'Comma',
	pattern: /,/
})
const Colon = createToken({
	name: 'Colon',
	pattern: /:/
})
const Identifier = createToken({
	name: 'Identifier',
	pattern: /[A-Za-z_][A-Za-z0-9_]*/
})
const IntLit = createToken({
	name: 'IntLit',
	pattern: /[0-9]+/
})
const StringValue = createToken({
	name: 'StringValue',
	pattern: /"([^"\\]|\\.)*"/
})
const WS = createToken({
	name: 'WS',
	pattern: /\s+/,
	group: Lexer.SKIPPED
})
const TypeKeyword = createToken({
	name: 'TypeKeyword',
	pattern: /string|int32/,
	longer_alt: Identifier
})
const MinLength = createToken({
	name: 'MinLength',
	pattern: /minLength/
})
const MaxLength = createToken({
	name: 'MaxLength',
	pattern: /maxLength/
})
const PatternToken = createToken({
	name: 'Pattern',
	pattern: /pattern/
})
const Format = createToken({
	name: 'Format',
	pattern: /format/
})
const Minimum = createToken({
	name: 'Minimum',
	pattern: /minimum/
})
const Enum = createToken({
	name: 'Enum',
	pattern: /enum/
})
const Example = createToken({
	name: 'Example',
	pattern: /example/
})

const allTokens = [
	Comment,
	WS,
	Message,
	Service,
	Rpc,
	Returns,
	Repeated,
	LCurly,
	RCurly,
	LParen,
	RParen,
	LBracket,
	RBracket,
	Semicolon,
	Equals,
	Comma,
	Colon,
	Enum,
	MinLength,
	MaxLength,
	PatternToken,
	Format,
	Minimum,
	Example,
	Identifier,
	TypeKeyword,
	IntLit,
	StringValue
]

const lexer = new Lexer(allTokens)

class MySchemaParser extends CstParser {
	constructor() {
		super(allTokens)
		const $ = this

		$.RULE('schemaFile', () => {
			$.MANY(() => {
				$.OR([
					{
						ALT: () => $.SUBRULE($.messageDecl)
					},
					{
						ALT: () => $.SUBRULE($.serviceDecl)
					}
				])
			})
		})

		$.RULE('messageDecl', () => {
			$.CONSUME(Message)
			$.CONSUME(Identifier)
			$.CONSUME(LCurly)
			$.MANY(() => {
				$.SUBRULE($.fieldDecl)
			})
			$.CONSUME(RCurly)
		})

		$.RULE('fieldDecl', () => {
			const repeated = $.OPTION1(() => {
				return $.CONSUME(Repeated)
			})

			$.OR([
				{
					ALT: () => $.CONSUME(TypeKeyword)
				},
				{
					ALT: () => $.CONSUME1(Identifier)
				}
			])

			$.CONSUME2(Identifier)
			$.CONSUME(Equals)
			$.CONSUME(IntLit)

			$.OPTION2(() => {
				$.CONSUME(LCurly)
				$.AT_LEAST_ONE_SEP({
					SEP: Comma,
					DEF: () => $.SUBRULE($.constraint)
				})
				$.CONSUME(RCurly)
			})

			$.CONSUME(Semicolon)

			return {
				repeated: !!repeated
			}
		})

		$.RULE('constraint', () => {
			$.OR([
				{
					ALT: () => $.SUBRULE($.kvConstraint)
				},
				{
					ALT: () => $.SUBRULE($.enumConstraint)
				}
			])
		})

		$.RULE('kvConstraint', () => {
			$.OR([
				{
					ALT: () => $.CONSUME(MinLength)
				},
				{
					ALT: () => $.CONSUME(MaxLength)
				},
				{
					ALT: () => $.CONSUME(PatternToken)
				},
				{
					ALT: () => $.CONSUME(Format)
				},
				{
					ALT: () => $.CONSUME(Minimum)
				},
				{
					ALT: () => $.CONSUME(Example)
				}
			])
			$.CONSUME(Colon)
			$.OR2([
				{
					ALT: () => $.CONSUME(IntLit)
				},
				{
					ALT: () => $.CONSUME(StringValue)
				}
			])
		})

		$.RULE('enumConstraint', () => {
			$.CONSUME(Enum)
			$.CONSUME(Colon)
			$.CONSUME(LBracket)
			$.AT_LEAST_ONE_SEP({
				SEP: Comma,
				DEF: () => {
					$.CONSUME(StringValue)
				}
			})
			$.CONSUME(RBracket)
		})

		$.RULE('serviceDecl', () => {
			$.CONSUME(Service)
			$.CONSUME(Identifier)
			$.CONSUME(LCurly)
			$.MANY(() => {
				$.SUBRULE($.rpcDecl)
			})
			$.CONSUME(RCurly)
		})

		$.RULE('rpcDecl', () => {
			$.CONSUME(Rpc)
			$.CONSUME(Identifier)
			$.CONSUME(LParen)
			$.CONSUME1(Identifier)
			$.CONSUME(RParen)
			$.CONSUME(Returns)
			$.CONSUME1(LParen)
			$.CONSUME2(Identifier)
			$.CONSUME1(RParen)
			$.CONSUME(Semicolon)
		})

		this.performSelfAnalysis()
	}
}

const parser = new MySchemaParser()

function parseSchema(input) {
	const lexResult = lexer.tokenize(input)
	parser.input = lexResult.tokens
	const cst = parser.schemaFile()
	if (parser.errors.length > 0) {
		throw new Error('Parsing errors detected:\n' + parser.errors[0].message)
	}
	return cst
}

function cstToAst(cst) {
	const ast = {
		messages: [],
		services: []
	}

	const messageDecls = cst.children.messageDecl || []
	for (const m of messageDecls) {
		const msgName = m.children.Identifier[0].image
		const fields = []
		const fieldDecls = m.children.fieldDecl || []
		for (const f of fieldDecls) {
			const repeated = f.children.Repeated ? true : false

			let typeToken
			if (f.children.TypeKeyword) {
				typeToken = f.children.TypeKeyword[0].image
			} else {
				typeToken = f.children.Identifier[0].image
			}

			const fieldName = f.children.Identifier[f.children.Identifier.length - 1].image
			const fieldNumber = parseInt(f.children.IntLit[0].image, 10)

			const constraints = {
			}
			if (f.children.LCurly) {
				const constraintNodes = f.children.constraint || []
				for (const cNode of constraintNodes) {
					if (cNode.children.kvConstraint) {
						const kv = cNode.children.kvConstraint[0]
						const keyToken = kv.children.MinLength || kv.children.MaxLength ||
							kv.children.Pattern || kv.children.Format ||
							kv.children.Minimum || kv.children.Example
						const key = keyToken[0].image
						const valToken = kv.children.IntLit ? kv.children.IntLit[0] : kv.children.StringValue[0]
						let val = valToken.image
						if (/^".*"$/.test(val)) {
							val = val.slice(1, -1)
						} else {
							val = parseInt(val, 10)
						}
						constraints[key] = val
					} else if (cNode.children.enumConstraint) {
						const enumItems = cNode.children.enumConstraint[0].children.StringValue.map(sv => sv.image.slice(1, -1))
						constraints.enum = enumItems
					}
				}
			}

			fields.push({
				name: fieldName,
				type: typeToken,
				number: fieldNumber,
				constraints,
				repeated
			})
		}

		ast.messages.push({
			name: msgName,
			fields
		})
	}

	const serviceDecls = cst.children.serviceDecl || []
	for (const s of serviceDecls) {
		const svcName = s.children.Identifier[0].image
		const rpcs = []
		const rpcDecls = s.children.rpcDecl || []
		for (const r of rpcDecls) {
			const rpcName = r.children.Identifier[0].image
			const requestType = r.children.Identifier[1].image
			const responseType = r.children.Identifier[2].image
			rpcs.push({
				name: rpcName,
				requestType,
				responseType
			})
		}
		ast.services.push({
			name: svcName,
			rpcs
		})
	}

	return ast
}

function astToJsonSchema(ast) {
	const definitions = {
	}

	function convertMessageToSchema(msg) {
		const properties = {
		}
		const requiredFields = []

		for (const field of msg.fields) {
			let jsonField = {
			}

			if (field.repeated) {
				jsonField.type = 'array'
				jsonField.items = {
				}

				if (field.type === 'string') {
					jsonField.items.type = 'string'
				} else if (field.type === 'int32' || field.type === 'integer') {
					jsonField.items.type = 'integer'
				} else {
					jsonField.items.$ref = `#/definitions/${field.type}`
				}

				for (const [k, v] of Object.entries(field.constraints)) {
					if (k === 'enum') {
						jsonField.items.enum = v
					} else {
						jsonField.items[k] = v
					}
				}
			} else {
				if (field.type === 'string') {
					jsonField.type = 'string'
				} else if (field.type === 'int32' || field.type === 'integer') {
					jsonField.type = 'integer'
				} else {
					jsonField.$ref = `#/definitions/${field.type}`
				}

				for (const [k, v] of Object.entries(field.constraints)) {
					jsonField[k] = v
				}
			}

			properties[field.name] = jsonField
			requiredFields.push(field.name)
		}

		return {
			type: 'object',
			properties,
			required: requiredFields
		}
	}

	for (const msg of ast.messages) {
		definitions[msg.name] = convertMessageToSchema(msg)
	}

	const rootMsg = ast.messages.length > 0 ? ast.messages[0].name : 'Root'

	return {
		$schema: 'http://json-schema.org/draft-07/schema#',
		$id: `#${rootMsg}`,
		$ref: `#/definitions/${rootMsg}`,
		definitions: {
			...definitions
		}
	}
}

function astToProto(ast) {
	const lines = []
	lines.push('syntax = "proto3";')
	lines.push('')

	for (const msg of ast.messages) {
		lines.push(`message ${msg.name} {`)
		for (const field of msg.fields) {
			const constraintKeys = Object.keys(field.constraints)
			if (constraintKeys.length > 0) {
				lines.push('  // Constraints:')
				for (const key of constraintKeys) {
					let val = field.constraints[key]
					if (Array.isArray(val)) {
						val = `[${val.map(JSON.stringify).join(', ')}]`
					} else if (typeof val === 'string') {
						val = JSON.stringify(val)
					}
					lines.push(`  //   ${key}: ${val}`)
				}
			}
			const repeatedStr = field.repeated ? 'repeated ' : ''
			lines.push(`  ${repeatedStr}${field.type} ${field.name} = ${field.number};`)
			lines.push('')
		}
		if (lines[lines.length - 1] === '') {
			lines.pop()
		}
		lines.push('}')
		lines.push('')
	}

	for (const svc of ast.services) {
		lines.push(`service ${svc.name} {`)
		for (const rpc of svc.rpcs) {
			lines.push(`  rpc ${rpc.name} (${rpc.requestType}) returns (${rpc.responseType});`)
		}
		lines.push('}')
		lines.push('')
	}

	if (lines[lines.length - 1] === '') {
		lines.pop()
	}

	return lines.join('\n')
}

function getMessageFields(ast, messageName) {
	const msg = ast.messages.find(m => m.name === messageName)
	if (!msg) return []
	return msg.fields.map(f => ({
		name: f.name,
		type: f.type,
		example: f.constraints.example,
		repeated: f.repeated
	}))
}

function buildExampleForMessage(ast, messageName) {
	const fields = getMessageFields(ast, messageName)
	const exampleObj = {
	}
	for (const f of fields) {
		if (f.repeated) {
			if (f.example !== undefined) {
				exampleObj[f.name] = [f.example]
			} else {
				if (f.type === 'string') {
					exampleObj[f.name] = ['example_string']
				} else if (f.type === 'int32' || f.type === 'integer') {
					exampleObj[f.name] = [1]
				} else {
					exampleObj[f.name] = [buildExampleForMessage(ast, f.type)]
				}
			}
		} else {
			if (f.example !== undefined) {
				exampleObj[f.name] = f.example
			} else {
				if (f.type === 'string') {
					exampleObj[f.name] = 'example_string'
				} else if (f.type === 'int32' || f.type === 'integer') {
					exampleObj[f.name] = 1
				} else {
					exampleObj[f.name] = buildExampleForMessage(ast, f.type)
				}
			}
		}
	}
	return exampleObj
}

function getRpcMethods(ast, serviceName) {
	const service = ast.services.find(svc => svc.name === serviceName)
	if (!service) return []
	return service.rpcs.map(rpc => {
		const requestFields = getMessageFields(ast, rpc.requestType)
		const responseFields = getMessageFields(ast, rpc.responseType)

		const requestExampleObj = buildExampleForMessage(ast, rpc.requestType)
		const responseExampleObj = buildExampleForMessage(ast, rpc.responseType)

		return {
			name: rpc.name,
			requestType: rpc.requestType,
			responseType: rpc.responseType,
			requestFields,
			responseFields,
			requestExample: JSON.stringify(requestExampleObj, null, 2),
			responseExample: JSON.stringify(responseExampleObj, null, 2)
		}
	})
}

function generateClientFile({
	protoFileName, serviceName, host, port, rpcMethods, schemaBaseName
}) {
	const templatePath = path.join(__dirname, 'templates/client_template.hbs')
	const templateSource = fs.readFileSync(templatePath, 'utf8')
	const template = Handlebars.compile(templateSource)
	const content = template({
		protoFileName,
		serviceName,
		host,
		port,
		rpcMethods,
		schemaBaseName
	})
	const clientFilePath = path.join(__dirname, '/dist/client.js')
	fs.writeFileSync(clientFilePath, content.replaceAll('&quot;', '\''), 'utf8')
	console.log(`Exported client file to ${clientFilePath}`)
}

function generateServerFile({
	protoFileName, serviceName, host, port, rpcMethods, schemaBaseName
}) {
	const templatePath = path.join(__dirname, 'templates/server_template.hbs')
	const templateSource = fs.readFileSync(templatePath, 'utf8')
	const template = Handlebars.compile(templateSource)

	Handlebars.registerHelper('eq', (a, b) => a === b)

	const content = template({
		protoFileName,
		serviceName,
		host,
		port,
		rpcMethods,
		schemaBaseName
	})
	const serverFilePath = path.join(__dirname, '/dist/server.js')
	fs.writeFileSync(serverFilePath, content.replaceAll('&quot;', '\''), 'utf8')
	console.log(`Exported server file to ${serverFilePath}`)
}

async function main() {
	const distPath = path.join(__dirname, 'dist')
	if (!fs.existsSync(distPath)) {
		fs.mkdirSync(distPath, {
			recursive: true
		})
		console.log(`Created "dist" directory at ${distPath}`)
	}

	const protosDir = path.join(__dirname, 'protos')
	if (!fs.existsSync(protosDir)) {
		console.error('No "protos" directory found.')
		process.exit(1)
	}

	const files = fs.readdirSync(protosDir).filter(f => f.endsWith('.protoschema'))
	if (files.length === 0) {
		console.error('No .protoschema files found in "protos" directory.')
		process.exit(1)
	}

	const selectedFile = await select({
		message: 'Select a .protoschema file to process:',
		choices: files.map(file => ({
			name: file,
			value: file
		}))
	})

	const schemaFilePath = path.join(protosDir, selectedFile)
	const schemaContent = fs.readFileSync(schemaFilePath, 'utf8')

	try {
		const cst = parseSchema(schemaContent)
		const ast = cstToAst(cst)

		if (ast.services.length === 0) {
			console.error('No services found in the selected schema.')
			process.exit(1)
		}

		for (const service of ast.services) {
			await servicesCollection.insertOne({
				name: service.name,
				rpcs: service.rpcs,
				sourceFile: selectedFile
			})
		}

		for (const message of ast.messages) {
			await messagesCollection.insertOne({
				name: message.name,
				fields: message.fields,
				sourceFile: selectedFile
			})
		}

		const selectedService = await select({
			message: 'Select a service to process:',
			choices: ast.services.map(s => ({
				name: s.name,
				value: s.name
			}))
		})

		const schema = astToJsonSchema(ast)
		const outDir = path.join(__dirname, 'dist')
		if (!fs.existsSync(outDir)) {
			fs.mkdirSync(outDir)
		}

		const baseName = path.parse(selectedFile).name
		const schemaFilePathJson = path.join(outDir, `${baseName}.schema.json`)
		fs.writeFileSync(schemaFilePathJson, JSON.stringify(schema, null, 2), 'utf8')
		console.log(`Exported JSON schema to ${schemaFilePathJson}`)

		const protoContent = astToProto(ast)
		const protoFilePath = path.join(outDir, `${baseName}.proto`)
		fs.writeFileSync(protoFilePath, protoContent, 'utf8')
		console.log(`Exported Protobuf schema to ${protoFilePath}`)

		const rpcMethods = getRpcMethods(ast, selectedService)

		generateClientFile({
			protoFileName: `${baseName}.proto`,
			serviceName: selectedService,
			host: 'localhost',
			port: '50051',
			rpcMethods,
			schemaBaseName: baseName
		})

		generateServerFile({
			protoFileName: `${baseName}.proto`,
			serviceName: selectedService,
			host: '0.0.0.0',
			port: '50051',
			rpcMethods,
			schemaBaseName: baseName
		})

		exec('npx eslint dist --fix', (error, stdout, stderr) => {
			if (error) {
				console.error(`ESLint error: ${error}`)
				return
			}
			if (stdout) console.log(stdout)
			if (stderr) console.error(stderr)
		})

	} catch (err) {
		console.error('Error:', err)
		process.exit(1)
	}
}

main().catch(err => {
	console.error('Unhandled error:', err)
	process.exit(1)
})
