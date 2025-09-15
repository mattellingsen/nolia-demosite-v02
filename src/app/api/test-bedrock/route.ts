import { NextRequest, NextResponse } from 'next/server';
import { BedrockRuntimeClient, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";

export async function GET(request: NextRequest) {
    try {
        console.log('🧪 Testing Bedrock access...');
        
        // Initialize Bedrock client (same as in claude-document-reasoner.ts)
        const bedrock = new BedrockRuntimeClient({
            region: process.env.AWS_REGION || 'ap-southeast-2'
        });

        // Test with a minimal Claude request
        const requestBody = {
            anthropic_version: "bedrock-2023-05-31",
            max_tokens: 50,
            temperature: 0.1,
            messages: [
                {
                    role: "user",
                    content: "Say 'Hello from Claude via Bedrock' - this is a test."
                }
            ]
        };

        const command = new InvokeModelCommand({
            modelId: "anthropic.claude-3-5-sonnet-20241022-v2:0",
            body: JSON.stringify(requestBody),
            contentType: "application/json"
        });

        console.log('🧪 Sending test request to Bedrock...');
        const response = await bedrock.send(command);
        const responseBody = JSON.parse(new TextDecoder().decode(response.body));
        
        console.log('✅ Bedrock test successful!');
        
        return NextResponse.json({
            success: true,
            message: "Bedrock is working!",
            claudeResponse: responseBody.content?.[0]?.text || "No response text",
            environment: process.env.NODE_ENV,
            region: process.env.AWS_REGION
        });
        
    } catch (error: any) {
        console.error('❌ Bedrock test failed:', error);
        
        return NextResponse.json({
            success: false,
            error: error.message,
            errorName: error.name,
            errorCode: error.$metadata?.httpStatusCode,
            environment: process.env.NODE_ENV,
            region: process.env.AWS_REGION,
            hasCredentials: !!(process.env.AWS_ACCESS_KEY_ID || process.env.AWS_SESSION_TOKEN)
        }, { status: 500 });
    }
}