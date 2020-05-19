import gql from 'graphql-tag';


export const user_fragment = gql`
    fragment ALL_FOR_USER on User {
        id
        username
        type
        realName
        email
        createdBy
        organisation
        description
        access {
            id
            projects {
                id
                name
                studyId
            }
            studies {
                id
                name
            }
        }
    }
`;

export const LOGIN = gql`
mutation login($username: String!, $password: String!) {
  login(username: $username, password: $password) {
      ...ALL_FOR_USER
  }
}
${user_fragment}
`;

export const WHO_AM_I = gql`
    query {
        whoAmI {
            ...ALL_FOR_USER
        }
    }
    ${user_fragment}
`;

export const LOGOUT = gql`
    mutation {
        logout{
            successful
            id
        }
    }
`;

export const REQUEST_USERNAME_OR_RESET_PASSWORD = gql`
    mutation requestUsernameOrResetPassword(
        $forgotUsername: Boolean!,
        $forgotPassword: Boolean!,
        $email: String,
        $username: String
    ) {
        requestUsernameOrResetPassword(
            forgotUsername: $forgotUsername,
            forgotPassword: $forgotPassword,
            email: $email,
            username: $username
        ) {
            successful
        }
    }
`;

export const RESET_PASSWORD = gql`
    mutation resetPassword(
        $username: String!,
        $token: String!,
        $newPassword: String!
    ) {
        resetPassword(
            username: $username,
            token: $token,
            newPassword: $newPassword
        ) {
            successful
        }
    }
`;