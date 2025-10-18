const fs = require('fs');
const axios = require('axios');
const path = require('path')
require('dotenv').config();

const { VAPI_API_KEY, VAPI_ASSISTANT_ID } = process.env;

async function updateSystemPrompt() {
  try {
    const promptPath = path.join(process.cwd(), '/assistant/vanessa_prompt.txt');
    const promptText = fs.readFileSync(promptPath, 'utf-8');

    // 2️⃣ Send PATCH to Vapi
    const res = await axios.patch(
      `https://api.vapi.ai/assistant/${VAPI_ASSISTANT_ID}`,
      { firstMessage: "Hi, this is Vanessa, your property acquisitions assistant",
				voicemailMessage:"Hello, this is Vanessa. I'm calling about your property. Please call us back anytime if you are interested in selling your property",
				endCallMessage:"Thank you for talking to us. We will work on your case quickly, Have a wonderful day!",
				model: {
					provider: "openai", 
					model: "gpt-4o", 
					messages: [{ role: "system", content: promptText }],
					tools: [{
						type: "transferCall",
						destinations: [{
							type: "number",
							number: "+16692644083"
						}]
					},
					{
						type: "apiRequest",
						url: "https://unmilitant-overquietly-darwin.ngrok-free.dev/owner/update",
						method: "POST",
						description: "revise owner's info based on conversation",
						name:"update_owner_status",
						body:{
							type:"object",
							properties:{
								"phone":{
									type:"string"
								},
								"status":{
									type:"string"
								},
							},
						},
					},
				],
				},
				hooks: [{
					on: "customer.speech.timeout",
					options: {
						timeoutSeconds: 180,
						triggerMaxCount: 3,
						triggerResetMode: "onUserSpeech"
					},
					do: [
						{
							type: "say",
							exact: [
								"Are you still there?",
								"Can I help you with anything else?",
								"I'm here whenever you're ready to continue."
							]
						}
					],
					name: "idle_message_check"
				}],
			},
      { headers: { Authorization: `Bearer ${VAPI_API_KEY}` } }
    );

    console.log(`Assistant ${res.data.id} updated successfully!`);
  } catch (err) {
    console.error('❌ Failed to update system prompt:');
    console.error(err.response?.data || err.message);
  }
}

updateSystemPrompt();
async function test(){
	const res = await axios.get(
		`https://api.vapi.ai/assistant/${VAPI_ASSISTANT_ID}`,
		{ headers: { Authorization: `Bearer ${VAPI_API_KEY}` } }
	);
	console.log('Hook config:', res.data.hooks);
}
//test()