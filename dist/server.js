const grpc = require('@grpc/grpc-js')
const protoLoader = require('@grpc/proto-loader')
const Ajv = require('ajv')
const addFormats = require('ajv-formats')

const packageDefinition = protoLoader.loadSync('user_service.proto', {
	keepCase: true,
	longs: String,
	enums: String,
	defaults: true,
	oneofs: true
})

const serviceDefinition = grpc.loadPackageDefinition(packageDefinition).UserService

const schema = require('./user_service.schema.json')

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

function main() {
	const server = new grpc.Server()

	server.addService(serviceDefinition.service, {
		GetUser: (call, callback) => {
			const validateRequest = getValidator('GetUserRequest')
			const validateResponse = getValidator('GetUserResponse')

			if (validateRequest && !validateRequest(call.request)) {
				const errors = validateRequest.errors.map(e => e.message).join(', ')
				return callback({
					code: grpc.status.INVALID_ARGUMENT,
					message: `Invalid request: ${errors}`
				})
			}

			const response = {
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

			if (validateResponse && !validateResponse(response)) {
				const errors = validateResponse.errors.map(e => e.message).join(', ')
				return callback({
					code: grpc.status.INTERNAL,
					message: `Invalid response: ${errors}`
				})
			}

			callback(null, response)
		},
		CreateUser: (call, callback) => {
			const validateRequest = getValidator('CreateUserRequest')
			const validateResponse = getValidator('CreateUserResponse')

			if (validateRequest && !validateRequest(call.request)) {
				const errors = validateRequest.errors.map(e => e.message).join(', ')
				return callback({
					code: grpc.status.INVALID_ARGUMENT,
					message: `Invalid request: ${errors}`
				})
			}

			const response = {
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

			if (validateResponse && !validateResponse(response)) {
				const errors = validateResponse.errors.map(e => e.message).join(', ')
				return callback({
					code: grpc.status.INTERNAL,
					message: `Invalid response: ${errors}`
				})
			}

			callback(null, response)
		},
	})

	server.bindAsync('0.0.0.0:50051', grpc.ServerCredentials.createInsecure(), (err, port) => {
		if (err) {
			console.error('Server binding error:', err)
			return
		}
		console.log('Server running at 0.0.0.0:50051')
		server.start()
	})
}

main()
