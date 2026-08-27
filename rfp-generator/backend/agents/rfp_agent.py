import os
from dotenv import load_dotenv
from langchain_groq import ChatGroq
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_community.vectorstores import Chroma
from langchain_google_genai import GoogleGenerativeAIEmbeddings

load_dotenv()

# llama-3.3-70b-versatile was decommissioned on Groq (2026-08-16).
# GROQ_MODEL allows swapping the model from the environment.
_llm = None


def get_llm() -> ChatGroq:
    """
    Builds the Groq client on first use rather than at import.

    Constructing it at module scope meant a missing GROQ_API_KEY raised during
    `import main`, so the whole API failed to start — sign-in, history and
    password reset included — over a key only proposal generation needs. Now
    the service boots either way and only this feature reports the problem.
    """
    global _llm

    if _llm is None:
        api_key = os.getenv("GROQ_API_KEY")
        if not api_key:
            raise RuntimeError(
                "GROQ_API_KEY is not set, so the AI features are unavailable. "
                "Add it to the service's environment variables."
            )
        _llm = ChatGroq(
            model=os.getenv("GROQ_MODEL", "openai/gpt-oss-120b"),
            api_key=api_key,
            temperature=0.7,
        )

    return _llm

parser = StrOutputParser()


def build_rag_retriever(rfp_text: str):
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=500,
        chunk_overlap=50
    )
    chunks = splitter.create_documents([rfp_text])
    # Hosted embeddings keep torch (~490 MB) out of the deployment image,
    # which is what lets this run on Render's free tier.
    embeddings = GoogleGenerativeAIEmbeddings(
        model="models/gemini-embedding-001",
        google_api_key=os.getenv("GEMINI_API_KEY")
    )
    vectorstore = Chroma.from_documents(
        documents=chunks,
        embedding=embeddings
    )
    retriever = vectorstore.as_retriever(
        search_kwargs={"k": 5}
    )
    return retriever


def get_relevant_context(retriever, query: str) -> str:
    docs = retriever.invoke(query)
    context = "\n\n".join([doc.page_content for doc in docs])
    return context


async def run_rfp_agent(rfp_text: str, profile: dict = {}) -> dict:

    print("Building RAG retriever...")
    retriever = build_rag_retriever(rfp_text)

    profile_context = f"""
    Company Name: {profile.get('companyName', 'Our Company')}
    Services: {profile.get('services', 'Software Development')}
    Team Size: {profile.get('teamSize', 'Experienced team')}
    Location: {profile.get('location', '')}
    Experience: {profile.get('experience', '')}
    Speciality: {profile.get('speciality', '')}
    """ if profile else "Our Company"

    # ── Step 1: Summarize ──────────────────────────────────────────────
    summary_context = get_relevant_context(
        retriever, "main goals objectives requirements overview"
    )

    summary_prompt = ChatPromptTemplate.from_template("""
    You are an expert business analyst. Based on the RFP content below, provide:
    1. A 3-sentence summary of what is being requested
    2. The client's main goals
    3. Key requirements they are looking for

    RFP CONTENT:
    {context}

    Respond in clear, concise bullet points.
    """)

    summary_chain = summary_prompt | get_llm() | parser
    summary = await summary_chain.ainvoke({"context": summary_context})

    # ── Step 2: Executive Summary ──────────────────────────────────────
    exec_context = get_relevant_context(
        retriever, "project overview purpose background objectives"
    )

    exec_prompt = ChatPromptTemplate.from_template("""
    You are a proposal writer for this company:
    {profile_context}

    Write a compelling Executive Summary for an RFP response.
    Use the company details above to personalize the response.
    Be professional, confident, and client-focused.

    RFP CONTENT:
    {context}

    Write 2-3 paragraphs for the Executive Summary section only.
    """)

    exec_chain = exec_prompt | get_llm() | parser
    executive_summary = await exec_chain.ainvoke({
        "context": exec_context,
        "profile_context": profile_context
    })

    # ── Step 3: Technical Approach ─────────────────────────────────────
    tech_context = get_relevant_context(
        retriever, "technical requirements specifications deliverables methodology"
    )

    tech_prompt = ChatPromptTemplate.from_template("""
    You are a technical writer. Write a Technical Approach section for an
    RFP response. Describe how your team would deliver the project based
    strictly on what the RFP asks for.

    RFP CONTENT:
    {context}

    Write the Technical Approach section with clear headings and bullet points.
    """)

    tech_chain = tech_prompt | get_llm() | parser
    technical_approach = await tech_chain.ainvoke({"context": tech_context})

    # ── Step 4: Timeline & Pricing ─────────────────────────────────────
    timeline_context = get_relevant_context(
        retriever, "timeline deadline budget pricing cost schedule milestones"
    )

    timeline_prompt = ChatPromptTemplate.from_template("""
    You are a project manager. Write a proposed Timeline and Pricing section
    for an RFP response. Include realistic phases and milestones based on
    what the RFP requires.

    RFP CONTENT:
    {context}

    Write the Timeline and Pricing section only.
    """)

    timeline_chain = timeline_prompt | get_llm() | parser
    timeline = await timeline_chain.ainvoke({"context": timeline_context})

    # ── Step 5: Combine into full response ─────────────────────────────
    full_response = f"""
# PROPOSAL RESPONSE

## Executive Summary
{executive_summary}

---

## Technical Approach
{technical_approach}

---

## Timeline & Pricing
{timeline}

---

*This proposal was generated by AI using RAG from your RFP content.
Please review and customize before submission.*
    """.strip()

    # ── Step 6: Generate Win Score ─────────────────────────────────────
    win_score_context = get_relevant_context(
        retriever, "requirements budget timeline experience qualifications"
    )

    win_score_prompt = ChatPromptTemplate.from_template("""
    You are a business development expert. Analyze this RFP and company profile
    and rate how likely this company is to win the bid.

    COMPANY PROFILE:
    {profile_context}

    RFP CONTENT:
    {context}

    Respond in this EXACT format, nothing else:
    SCORE: [number between 1-100]
    RATING: [one of: Excellent, Strong, Moderate, Challenging]
    STRENGTH_1: [first strength in one sentence]
    STRENGTH_2: [second strength in one sentence]
    STRENGTH_3: [third strength in one sentence]
    CHALLENGE_1: [first challenge in one sentence]
    CHALLENGE_2: [second challenge in one sentence]
    RECOMMENDATION: [one sentence advice]
    """)

    win_chain = win_score_prompt | get_llm() | parser
    win_raw = await win_chain.ainvoke({
        "context": win_score_context,
        "profile_context": profile_context
    })

    # Parse the win score response
    win_score = {}
    for line in win_raw.strip().split("\n"):
        if ":" in line:
            key, value = line.split(":", 1)
            win_score[key.strip()] = value.strip()

    return {
        "summary": summary,
        "response": full_response,
        "sections": {
            "executive_summary": executive_summary,
            "technical_approach": technical_approach,
            "timeline": timeline
        },
        "win_score": win_score
    }