const sonarqubeScanner = require('sonarqube-scanner')
const dotenv = require('dotenv')

dotenv.config()

sonarqubeScanner(
    {
        serverUrl: process.env.SONAR_HOST_URL,
        token: process.env.SONAR_TOKEN,
        options: {
            'sonar.sources': 'src',
            'sonar.tests': '.',
            'sonar.inclusions': 'src/**/*.ts', // Entry point of your code
            'sonar.test.inclusions': 'test/**/*.ts',
            'sonar.javascript.lcov.reportPaths': 'coverage/lcov.info',
            'sonar.testExecutionReportPaths': 'coverage/test-reporter.xml'
        }
    }, () => {})

