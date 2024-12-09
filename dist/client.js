const grpc = require('@grpc/grpc-js')
const protoLoader = require('@grpc/proto-loader')
const Ajv = require('ajv')
const addFormats = require('ajv-formats')
const fs = require('fs')
const path = require('path')

const PROTO_PATH = path.join(__dirname, 'user_service.proto')
const SCHEMA_PATH = path.join(__dirname, 'user_service.schema.json')

const schema = JSON.parse(fs.readFileSync(SCHEMA_PATH, 'utf8'))

const ajv = new Ajv({
	allErrors: true,
	strict: false 
})
addFormats(ajv)
ajv.addSchema(schema, 'rootSchema')

function getValidator(msgName) {
	const validate = ajv.getSchema(`rootSchema#/definitions/${msgName}`)
	return validate || null
}

const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
	keepCase: true,
	longs: String,
	enums: String,
	defaults: true,
	oneofs: true
})

const protoDescriptor = grpc.loadPackageDefinition(packageDefinition)
const Service = protoDescriptor.UserService

const client = new Service('localhost:50051', grpc.credentials.createInsecure())

{
	const requestData = {
		user_id: 1
	}

	const validateRequest = getValidator('GetUserRequest')

	if (validateRequest && !validateRequest(requestData)) {
		console.error('Validation errors for GetUser request:', validateRequest.errors)
	} else {
		client.GetUser(requestData, (err, response) => {
			if (err) {
				console.error('Error calling GetUser:', err)
				return
			}

			const validateResponse = getValidator('GetUserResponse')
			if (validateResponse && !validateResponse(response)) {
				console.error('Validation errors for GetUser response:', validateResponse.errors)
			} else {
				console.log('GetUser Response:', response)
			}
		})
	}
}
{
	const requestData = {
		user: {
			username: 'JohnDoe',
			email: 'joe.doe@example.com',
			age: 2,
			address: {
				street: '123 Main St',
				city: 'Reno',
				country: 'US'
			}
		}
	}

	const validateRequest = getValidator('CreateUserRequest')

	if (validateRequest && !validateRequest(requestData)) {
		console.error('Validation errors for CreateUser request:', validateRequest.errors)
	} else {
		client.CreateUser(requestData, (err, response) => {
			if (err) {
				console.error('Error calling CreateUser:', err)
				return
			}

			const validateResponse = getValidator('CreateUserResponse')
			if (validateResponse && !validateResponse(response)) {
				console.error('Validation errors for CreateUser response:', validateResponse.errors)
			} else {
				console.log('CreateUser Response:', response)
			}
		})
	}
}
