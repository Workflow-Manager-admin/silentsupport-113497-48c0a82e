from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from typing import List, Optional
from pydantic import BaseModel, Field
from uuid import uuid4, UUID


# PUBLIC_INTERFACE
class TicketStatus(str):
    """Enum for ticket statuses."""
    OPEN = "open"
    IN_PROGRESS = "in_progress"
    RESOLVED = "resolved"
    CLOSED = "closed"


# PUBLIC_INTERFACE
class TicketCreate(BaseModel):
    """Model for submitting a new ticket."""
    subject: str = Field(..., description="Short subject/summary of the ticket.")
    description: str = Field(..., description="Detailed description of the issue/feedback.")


# PUBLIC_INTERFACE
class TicketUpdate(BaseModel):
    """Model for updating an existing ticket."""
    subject: Optional[str] = Field(None, description="Short subject/summary of the ticket.")
    description: Optional[str] = Field(None, description="Detailed description of the issue/feedback.")
    status: Optional[str] = Field(None, description="The status of the ticket.")


# PUBLIC_INTERFACE
class Ticket(BaseModel):
    """Ticket model used for output to clients."""
    id: UUID = Field(..., description="Unique ticket identifier")
    subject: str = Field(..., description="Short subject/summary of the ticket.")
    description: str = Field(..., description="Detailed description of the ticket.")
    status: str = Field(..., description="Current status of the ticket.")
    created_at: str = Field(..., description="Ticket creation time (ISO format)")
    updated_at: str = Field(..., description="Last update time (ISO format)")


app = FastAPI(
    title="SilentSupport Anonymous Ticketing API",
    description="REST API for submitting, updating, and tracking anonymous tickets.",
    version="1.0.0",
    openapi_tags=[
        {"name": "Tickets", "description": "Anonymous ticket operations: submit, view, update, and status management."}
    ]
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from datetime import datetime

# In-memory ticket "database"
tickets_db = dict()


@app.get("/", tags=["Health"])
def health_check():
    """Basic service health check endpoint."""
    return {"message": "Healthy"}


# PUBLIC_INTERFACE
@app.post(
    "/tickets",
    status_code=status.HTTP_201_CREATED,
    response_model=Ticket,
    tags=["Tickets"],
    summary="Submit an anonymous ticket",
    description="Create a new anonymous ticket with subject and description.",
)
def submit_ticket(ticket: TicketCreate):
    """
    Submit a new ticket anonymously.

    Args:
        ticket (TicketCreate): The ticket contents.

    Returns:
        Ticket: The created ticket (with ticket ID and timestamps).
    """
    ticket_id = uuid4()
    now = datetime.utcnow().isoformat()
    ticket_obj = {
        "id": ticket_id,
        "subject": ticket.subject,
        "description": ticket.description,
        "status": TicketStatus.OPEN,
        "created_at": now,
        "updated_at": now,
    }
    tickets_db[str(ticket_id)] = ticket_obj
    return ticket_obj


# PUBLIC_INTERFACE
@app.get(
    "/tickets",
    response_model=List[Ticket],
    tags=["Tickets"],
    summary="List all submitted tickets",
    description="Retrieve all submitted tickets (anonymously).",
)
def list_tickets():
    """
    List all tickets. No authentication required.

    Returns:
        List[Ticket]: All submitted tickets (anonymous; no user association).
    """
    return list(tickets_db.values())


# PUBLIC_INTERFACE
@app.get(
    "/tickets/{ticket_id}",
    response_model=Ticket,
    tags=["Tickets"],
    summary="Get a specific ticket by ID",
    description="Retrieve details of a ticket given its ticket ID.",
)
def get_ticket(ticket_id: str):
    """
    Fetch a ticket by its unique ID.

    Args:
        ticket_id (str): UUID string of the ticket.

    Returns:
        Ticket: Ticket data if found.
    """
    ticket = tickets_db.get(ticket_id)
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    return ticket


# PUBLIC_INTERFACE
@app.put(
    "/tickets/{ticket_id}",
    response_model=Ticket,
    tags=["Tickets"],
    summary="Update (edit) a submitted ticket",
    description="Edit the subject, description, or status of a ticket. Anonymous, no authentication required.",
)
def update_ticket(ticket_id: str, ticket_update: TicketUpdate):
    """
    Update fields of an existing ticket.

    Args:
        ticket_id (str): UUID string of the ticket.
        ticket_update (TicketUpdate): Fields to update (subject, description, status).

    Returns:
        Ticket: The updated ticket.
    """
    ticket = tickets_db.get(ticket_id)
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")

    changed = False
    if ticket_update.subject is not None:
        ticket["subject"] = ticket_update.subject
        changed = True
    if ticket_update.description is not None:
        ticket["description"] = ticket_update.description
        changed = True
    if ticket_update.status is not None:
        if ticket_update.status not in [
            TicketStatus.OPEN,
            TicketStatus.IN_PROGRESS,
            TicketStatus.RESOLVED,
            TicketStatus.CLOSED,
        ]:
            raise HTTPException(status_code=400, detail="Invalid status")
        ticket["status"] = ticket_update.status
        changed = True

    if changed:
        ticket["updated_at"] = datetime.utcnow().isoformat()

    return ticket


# PUBLIC_INTERFACE
@app.get(
    "/tickets/{ticket_id}/status",
    response_model=dict,
    tags=["Tickets"],
    summary="Get the status of a ticket",
    description="Retrieve only the status of the specified ticket.",
)
def get_ticket_status(ticket_id: str):
    """
    Get the status of a ticket by ticket ID.

    Args:
        ticket_id (str): UUID string of the ticket.

    Returns:
        dict: Ticket status.
    """
    ticket = tickets_db.get(ticket_id)
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    return {"status": ticket["status"]}


# Bonus: delete for admin/testing purpose (not for users)
@app.delete("/tickets/{ticket_id}", tags=["Tickets"], include_in_schema=False)
def delete_ticket(ticket_id: str):
    if ticket_id in tickets_db:
        del tickets_db[ticket_id]
        return JSONResponse(content={"message": "Ticket deleted"})
    raise HTTPException(status_code=404, detail="Ticket not found")

