-- MS SQL Database Schema for Billing Omnichannel Ticketing Platform
USE BillingOmnichannel;

-- 1. Users Table
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Users')
BEGIN
    CREATE TABLE Users (
        id INT IDENTITY(1,1) PRIMARY KEY,
        username NVARCHAR(50) NOT NULL UNIQUE,
        display_alias NVARCHAR(100) NOT NULL,
        email NVARCHAR(100) NOT NULL UNIQUE,
        password_hash NVARCHAR(255) NOT NULL,
        role NVARCHAR(20) NOT NULL CHECK (role IN ('ADMIN', 'SUPERVISOR', 'AGENT')),
        is_active BIT NOT NULL DEFAULT 1,
        avatar_url NVARCHAR(500) NULL,
        created_at DATETIMEOFFSET NOT NULL DEFAULT SYSDATETIMEOFFSET()
    );
    CREATE INDEX IX_Users_Role ON Users(role);
END;

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Users') AND name = 'avatar_url')
BEGIN
    ALTER TABLE Users ADD avatar_url NVARCHAR(500) NULL;
END;

-- 2. Channels Table
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Channels')
BEGIN
    CREATE TABLE Channels (
        id INT IDENTITY(1,1) PRIMARY KEY,
        channel_type NVARCHAR(20) NOT NULL CHECK (channel_type IN ('WHATSAPP', 'TELEGRAM')),
        account_identifier NVARCHAR(100) NULL,
        status NVARCHAR(30) NOT NULL DEFAULT 'DISCONNECTED',
        session_data NVARCHAR(MAX) NULL,
        enable_agent_prefix BIT NOT NULL DEFAULT 1,
        prefix_template NVARCHAR(100) NOT NULL DEFAULT '*[{display_alias}]*:',
        prefix_mode NVARCHAR(50) NOT NULL DEFAULT 'ALWAYS' CHECK (prefix_mode IN ('ALWAYS', 'ONCE_PER_HANDOFF', 'FIRST_RESPONSE_ONLY')),
        last_connected_at DATETIMEOFFSET NULL,
        created_at DATETIMEOFFSET NOT NULL DEFAULT SYSDATETIMEOFFSET()
    );
END;

-- 3. Customers Table
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Customers')
BEGIN
    CREATE TABLE Customers (
        id INT IDENTITY(1,1) PRIMARY KEY,
        phone_number NVARCHAR(50) NULL,
        telegram_user_id NVARCHAR(50) NULL,
        full_name NVARCHAR(150) NOT NULL,
        email NVARCHAR(150) NULL,
        company_name NVARCHAR(150) NULL,
        customer_category NVARCHAR(50) NOT NULL DEFAULT 'REGULER',
        address NVARCHAR(MAX) NULL,
        notes NVARCHAR(MAX) NULL,
        contact_type NVARCHAR(50) NOT NULL DEFAULT 'CUSTOMER' CHECK (contact_type IN ('CUSTOMER', 'INTERNAL', 'VENDOR')),
        division NVARCHAR(100) NULL,
        employee_id NVARCHAR(50) NULL,
        channel_source NVARCHAR(20) NOT NULL CHECK (channel_source IN ('WHATSAPP', 'TELEGRAM')),
        billing_account_id NVARCHAR(100) NULL,
        created_at DATETIMEOFFSET NOT NULL DEFAULT SYSDATETIMEOFFSET()
    );
    CREATE INDEX IX_Customers_Phone ON Customers(phone_number);
    CREATE INDEX IX_Customers_TelegramId ON Customers(telegram_user_id);
END;

-- Migration: Add new CRM columns if Customers table already exists
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Customers') AND name = 'email')
BEGIN
    ALTER TABLE Customers ADD email NVARCHAR(150) NULL;
END;
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Customers') AND name = 'company_name')
BEGIN
    ALTER TABLE Customers ADD company_name NVARCHAR(150) NULL;
END;
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Customers') AND name = 'customer_category')
BEGIN
    ALTER TABLE Customers ADD customer_category NVARCHAR(50) NOT NULL DEFAULT 'REGULER';
END;
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Customers') AND name = 'address')
BEGIN
    ALTER TABLE Customers ADD address NVARCHAR(MAX) NULL;
END;
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Customers') AND name = 'notes')
BEGIN
    ALTER TABLE Customers ADD notes NVARCHAR(MAX) NULL;
END;
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Customers') AND name = 'contact_type')
BEGIN
    ALTER TABLE Customers ADD contact_type NVARCHAR(50) NOT NULL DEFAULT 'CUSTOMER';
END;
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Customers') AND name = 'division')
BEGIN
    ALTER TABLE Customers ADD division NVARCHAR(100) NULL;
END;
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Customers') AND name = 'employee_id')
BEGIN
    ALTER TABLE Customers ADD employee_id NVARCHAR(50) NULL;
END;

-- 4. Tickets Table
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Tickets')
BEGIN
    CREATE TABLE Tickets (
        id INT IDENTITY(1,1) PRIMARY KEY,
        ticket_number NVARCHAR(50) NOT NULL UNIQUE,
        customer_id INT NOT NULL REFERENCES Customers(id),
        channel_id INT NOT NULL REFERENCES Channels(id),
        assigned_to_user_id INT NULL REFERENCES Users(id),
        status NVARCHAR(30) NOT NULL DEFAULT 'UNASSIGNED' CHECK (status IN ('UNASSIGNED', 'ASSIGNED', 'IN_PROGRESS', 'WAITING_CUSTOMER', 'RESOLVED', 'CLOSED')),
        first_response_at DATETIMEOFFSET NULL,
        resolved_at DATETIMEOFFSET NULL,
        last_customer_message_at DATETIMEOFFSET NULL,
        auto_close_deadline DATETIMEOFFSET NULL,
        is_sla_breached BIT NOT NULL DEFAULT 0,
        created_at DATETIMEOFFSET NOT NULL DEFAULT SYSDATETIMEOFFSET()
    );
    CREATE INDEX IX_Tickets_Status ON Tickets(status);
    CREATE INDEX IX_Tickets_Assigned ON Tickets(assigned_to_user_id);
    CREATE INDEX IX_Tickets_Customer ON Tickets(customer_id);
END;

-- 5. Messages Table
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Messages')
BEGIN
    CREATE TABLE Messages (
        id INT IDENTITY(1,1) PRIMARY KEY,
        ticket_id INT NOT NULL REFERENCES Tickets(id) ON DELETE CASCADE,
        sender_type NVARCHAR(20) NOT NULL CHECK (sender_type IN ('CUSTOMER', 'AGENT', 'SYSTEM')),
        sender_user_id INT NULL REFERENCES Users(id),
        message_type NVARCHAR(20) NOT NULL DEFAULT 'TEXT' CHECK (message_type IN ('TEXT', 'IMAGE', 'DOCUMENT', 'AUDIO')),
        content NVARCHAR(MAX) NOT NULL,
        injected_prefix NVARCHAR(100) NULL,
        media_url NVARCHAR(500) NULL,
        external_message_id NVARCHAR(150) NULL,
        delivery_status NVARCHAR(20) NOT NULL DEFAULT 'SENT' CHECK (delivery_status IN ('PENDING', 'SENT', 'DELIVERED', 'READ', 'FAILED')),
        timestamp DATETIMEOFFSET NOT NULL DEFAULT SYSDATETIMEOFFSET()
    );
    CREATE INDEX IX_Messages_Ticket ON Messages(ticket_id);
    CREATE INDEX IX_Messages_Timestamp ON Messages(timestamp);
END;

-- 6. InternalNotes Table (Whisper Mode)
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'InternalNotes')
BEGIN
    CREATE TABLE InternalNotes (
        id INT IDENTITY(1,1) PRIMARY KEY,
        ticket_id INT NOT NULL REFERENCES Tickets(id) ON DELETE CASCADE,
        author_user_id INT NOT NULL REFERENCES Users(id),
        note_text NVARCHAR(MAX) NOT NULL,
        created_at DATETIMEOFFSET NOT NULL DEFAULT SYSDATETIMEOFFSET()
    );
    CREATE INDEX IX_InternalNotes_Ticket ON InternalNotes(ticket_id);
END;

-- 7. TicketAuditLogs Table
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'TicketAuditLogs')
BEGIN
    CREATE TABLE TicketAuditLogs (
        id INT IDENTITY(1,1) PRIMARY KEY,
        ticket_id INT NOT NULL REFERENCES Tickets(id) ON DELETE CASCADE,
        user_id INT NULL REFERENCES Users(id),
        action NVARCHAR(50) NOT NULL,
        details NVARCHAR(MAX) NULL,
        created_at DATETIMEOFFSET NOT NULL DEFAULT SYSDATETIMEOFFSET()
    );
    CREATE INDEX IX_TicketAuditLogs_Ticket ON TicketAuditLogs(ticket_id);
END;

-- 8. SLAPolicies Table
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'SLAPolicies')
BEGIN
    CREATE TABLE SLAPolicies (
        id INT IDENTITY(1,1) PRIMARY KEY,
        name NVARCHAR(100) NOT NULL,
        max_first_response_minutes INT NOT NULL DEFAULT 5,
        max_resolution_hours INT NOT NULL DEFAULT 24,
        is_active BIT NOT NULL DEFAULT 1,
        created_at DATETIMEOFFSET NOT NULL DEFAULT SYSDATETIMEOFFSET()
    );
END;

-- 9. Roles Table (Dynamic Granular RBAC)
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Roles')
BEGIN
    CREATE TABLE Roles (
        id INT IDENTITY(1,1) PRIMARY KEY,
        role_code NVARCHAR(50) NOT NULL UNIQUE,
        role_name NVARCHAR(100) NOT NULL,
        description NVARCHAR(255) NULL,
        permissions NVARCHAR(MAX) NOT NULL,
        is_system BIT NOT NULL DEFAULT 0,
        created_at DATETIMEOFFSET NOT NULL DEFAULT SYSDATETIMEOFFSET()
    );
END;

-- 10. Workspaces Table
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Workspaces')
BEGIN
    CREATE TABLE Workspaces (
        id INT IDENTITY(1,1) PRIMARY KEY,
        code NVARCHAR(50) NOT NULL UNIQUE,
        name NVARCHAR(100) NOT NULL,
        description NVARCHAR(255) NULL,
        color NVARCHAR(20) NOT NULL DEFAULT '#4F46E5',
        icon NVARCHAR(50) NOT NULL DEFAULT 'briefcase',
        is_active BIT NOT NULL DEFAULT 1,
        created_at DATETIMEOFFSET NOT NULL DEFAULT SYSDATETIMEOFFSET()
    );
END;

-- 11. WorkspaceUsers Table (Multi-to-Multi Agent Workspace Assignment)
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'WorkspaceUsers')
BEGIN
    CREATE TABLE WorkspaceUsers (
        id INT IDENTITY(1,1) PRIMARY KEY,
        workspace_id INT NOT NULL REFERENCES Workspaces(id) ON DELETE CASCADE,
        user_id INT NOT NULL REFERENCES Users(id) ON DELETE CASCADE,
        created_at DATETIMEOFFSET NOT NULL DEFAULT SYSDATETIMEOFFSET(),
        CONSTRAINT UQ_Workspace_User UNIQUE (workspace_id, user_id)
    );
END;

-- 12. WorkspaceChannels Table (Inbound Channel to Workspace Mapping)
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'WorkspaceChannels')
BEGIN
    CREATE TABLE WorkspaceChannels (
        id INT IDENTITY(1,1) PRIMARY KEY,
        workspace_id INT NOT NULL REFERENCES Workspaces(id) ON DELETE CASCADE,
        channel_id INT NOT NULL REFERENCES Channels(id) ON DELETE CASCADE,
        created_at DATETIMEOFFSET NOT NULL DEFAULT SYSDATETIMEOFFSET(),
        CONSTRAINT UQ_Workspace_Channel UNIQUE (workspace_id, channel_id)
    );
END;
