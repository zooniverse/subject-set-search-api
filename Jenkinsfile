#!groovy

pipeline {
  agent none

  options {
    disableConcurrentBuilds()
  }

  stages {
    stage('Build Subject Set Search API Docker image') {
      environment {
        JOB_TIME = sh (returnStdout: true, script: "date '+%A %W %Y %X'").trim()
      }
      agent any
      steps {
        script {
          def dockerRepoName = 'zooniverse/subject-set-search-api'
          def dockerImageName = "${dockerRepoName}:${GIT_COMMIT}"
          def buildArgs = "--build-arg BUILD_DATE='${JOB_TIME}' ."
          def newImage = docker.build(dockerImageName, buildArgs)
          newImage.push()

          if (BRANCH_NAME == 'main') {
            stage('Update latest tag') {
              newImage.push('latest')
            }
          }
        }
      }
    }

    stage('Dry run deployments') {
      agent any
      steps {
        sh "kubectl --context azure apply --dry-run=client --record -f kubernetes/deployment-production.yaml"
      }
    }

    stage('Deploy production to Kubernetes') {
      when { branch 'main' }
      agent any
      steps {
        sh "kubectl --context azure apply --record -f kubernetes/deployment-production.yaml"
        /* the following ensures new pods are created using latest tag
           this is due to the spec template including the imagePullPolicy: Always
           and then when the deployment restarts the pods. Without the extra deployment
           restart the pods won't recreate as the spec template won't have changed */
        sh "kubectl --context azure rollout restart deployment subject-set-search-api-production-app"
      }
    }
  }

  post {
    success {
      script {
        if (BRANCH_NAME == 'main') {
          slackSend (
            color: '#00FF00',
            message: "SUCCESSFUL: Job '${env.JOB_NAME} [${env.BUILD_NUMBER}]' (${env.BUILD_URL})",
            channel: "#deploys"
          )
        }
      }
    }

    failure {
      script {
        if (BRANCH_NAME == 'main') {
          slackSend (
            color: '#FF0000',
            message: "FAILED: Job '${env.JOB_NAME} [${env.BUILD_NUMBER}]' (${env.BUILD_URL})",
            channel: "#deploys"
          )
        }
      }
    }
  }
}
