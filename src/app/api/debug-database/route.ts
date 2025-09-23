import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/database-s3';

export async function GET(request: NextRequest) {
    try {
        console.log('🔍 Database diagnostic starting...');

        // Test 1: Basic database connection
        const connectionTest = await prisma.$queryRaw`SELECT 1 as test`;
        console.log('✅ Database connection test passed:', connectionTest);

        // Test 2: List all funds to see what's available
        const funds = await prisma.fund.findMany({
            select: {
                id: true,
                name: true,
                createdAt: true
            },
            take: 5
        });
        console.log('📋 Available funds:', funds);

        // Test 3: Check DATABASE_URL configuration
        const databaseUrl = process.env.DATABASE_URL;
        const maskedUrl = databaseUrl ?
            databaseUrl.replace(/:[^:@]*@/, ':***@') : 'NOT_SET';
        console.log('🔧 Database URL (masked):', maskedUrl);

        // Test 4: Check if we can find a specific fund (if any)
        let specificFundTest = null;
        if (funds.length > 0) {
            const firstFundId = funds[0].id;
            specificFundTest = await prisma.fund.findUnique({
                where: { id: firstFundId },
                include: { documents: true }
            });
            console.log('🎯 Specific fund query test passed for:', firstFundId);
        }

        return NextResponse.json({
            success: true,
            diagnostics: {
                connectionTest: 'PASSED',
                fundsCount: funds.length,
                funds: funds,
                databaseUrl: maskedUrl,
                specificFundTest: specificFundTest ? 'PASSED' : 'SKIPPED',
                timestamp: new Date().toISOString()
            }
        });

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        const errorStack = error instanceof Error ? error.stack : undefined;

        console.error('❌ Database diagnostic failed:', {
            error: errorMessage,
            stack: errorStack,
            errorType: error?.constructor?.name || 'Unknown'
        });

        // Detailed error analysis
        let errorCategory = 'UNKNOWN_ERROR';
        let troubleshooting = 'Unknown database error';

        if (errorMessage.includes('connection') || errorMessage.includes('connect')) {
            errorCategory = 'CONNECTION_ERROR';
            troubleshooting = 'Database connection failed - check DATABASE_URL and network connectivity';
        } else if (errorMessage.includes('authentication') || errorMessage.includes('password')) {
            errorCategory = 'AUTH_ERROR';
            troubleshooting = 'Database authentication failed - check credentials in DATABASE_URL';
        } else if (errorMessage.includes('timeout')) {
            errorCategory = 'TIMEOUT_ERROR';
            troubleshooting = 'Database query timeout - check database performance and connection pooling';
        } else if (errorMessage.includes('does not exist') || errorMessage.includes('relation')) {
            errorCategory = 'SCHEMA_ERROR';
            troubleshooting = 'Database schema issue - run prisma migrate or check table existence';
        }

        return NextResponse.json(
            {
                success: false,
                error: errorMessage,
                errorCategory,
                troubleshooting,
                timestamp: new Date().toISOString(),
                diagnostics: {
                    databaseUrl: process.env.DATABASE_URL ? 'SET' : 'NOT_SET'
                }
            },
            { status: 500 }
        );
    }
}