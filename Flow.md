# API Flow Documentation

This document describes the operational flow of the BlueMoon Admin API using Mermaid diagrams.

## 1. General Request Lifecycle

This flowchart shows how a request is processed from the moment it hits the server until a response is returned.

```mermaid
graph TD
    Client[Client Request] -->|HTTP Request| Server[Express Server]

    subgraph "App Level Middleware"
        Server --> Morgan["Logger (Morgan)"]
        Morgan --> Helmet["Security (Helmet)"]
        Helmet --> CORS[CORS Handling]
        CORS --> Parser["Body Parser (JSON/URL Encoded)"]
    end

    Parser --> Router[Main Router /api]

    subgraph "Routing & Logic"
        Router --> AuthRoute["/auth"]
        Router --> ResidentRoute["/residents"]
        Router --> AptRoute["/apartments"]
        Router --> FeeRoute["/fees"]
        Router --> TxRoute["/transactions"]
        Router --> StatsRoute["/stats"]
    end

    subgraph "Route Processing"
        AuthRoute --> AuthCtrl[Auth Controller]

        ResidentRoute --> AuthMW[Protect Middleware]
        AuthMW --> ResidentCtrl[Resident Controller]

        AptRoute --> AuthMW
        AptRoute --> AptCtrl[Apartment Controller]

        FeeRoute --> AuthMW
        AuthMW --> RoleMW[Authorize Middleware]
        RoleMW --> FeeCtrl[Fee Controller]
        AuthMW --> FeeCtrl

        TxRoute --> AuthMW
        AuthMW --> TxCtrl[Transaction Controller]

        StatsRoute --> AuthMW
        AuthMW --> StatsCtrl[Stats Controller]
    end

    subgraph "Data Layer"
        AuthCtrl & ResidentCtrl & AptCtrl & FeeCtrl & TxCtrl & StatsCtrl --> MongoDB[(MongoDB Database)]
    end

    MongoDB -->|Data| Controllers[Controllers]
    Controllers -->|JSON Response| Client
```

## 2. Detailed API Routes Flow

The following sequence diagram illustrates the specific flows for the available endpoints, highlighting the middleware protection.

```mermaid
sequenceDiagram
    participant C as Client
    participant S as Server
    participant AM as Auth Middleware (Protect)
    participant RM as Role Middleware (Authorize)
    participant CTRL as Controller
    participant DB as MongoDB

    Note over C, DB: **Authentication**
    C->>S: POST /api/auth/login
    S->>CTRL: loginUser()
    CTRL->>DB: Find User
    DB-->>CTRL: User Data
    CTRL-->>C: Return JWT Token

    Note over C, DB: **Residents (Protected)**
    C->>S: GET /api/residents
    S->>AM: Verify Token
    alt Invalid Token
        AM-->>C: 401 Unauthorized
    else Valid Token
        AM->>CTRL: getResidents()
        CTRL->>DB: Query Residents
        DB-->>CTRL: Residents List
        CTRL-->>C: JSON Response
    end

    Note over C, DB: **Fees (Protected + Admin Role)**
    C->>S: POST /api/fees
    S->>AM: Verify Token
    alt Valid Token
        AM->>RM: Check Role('admin')
        alt Not Admin
            RM-->>C: 403 Forbidden
        else Is Admin
            RM->>CTRL: createFee()
            CTRL->>DB: Save Fee
            DB-->>CTRL: Saved Fee
            CTRL-->>C: 201 Created
        end
    end

    Note over C, DB: **Apartments (Protected)**
    C->>S: POST /api/apartments
    S->>AM: Verify Token
    AM->>CTRL: createApartment()
    CTRL->>DB: Create Apartment
    CTRL-->>C: 201 Created

    Note over C, DB: **Transactions**
    C->>S: POST /api/transactions
    S->>AM: Verify Token
    AM->>CTRL: createTransaction()
    CTRL->>DB: Save Transaction
    CTRL-->>C: 200 OK

    Note over C, DB: **Statistics**
    C->>S: GET /api/stats/dashboard
    S->>AM: Verify Token
    AM->>CTRL: getDashboardStats()
    CTRL->>DB: Aggregate Data
    CTRL-->>C: Stats Data
```
