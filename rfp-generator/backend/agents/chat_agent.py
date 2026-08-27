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
            temperature=0.3,
        )

    return _llm

parser = StrOutputParser()


async def answer_question(rfp_text: str, question: str) -> str:
    """
    Builds a RAG retriever from the RFP text
    and answers the user's question using only
    the RFP content.
    """

    # Step 1: Split RFP into chunks
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=500,
        chunk_overlap=50
    )
    chunks = splitter.create_documents([rfp_text])

    # Step 2: Store in ChromaDB
    embeddings = GoogleGenerativeAIEmbeddings(
        model="models/gemini-embedding-001",
        google_api_key=os.getenv("GEMINI_API_KEY")
    )
    vectorstore = Chroma.from_documents(
        documents=chunks,
        embedding=embeddings
    )

    # Step 3: Find relevant chunks for the question
    retriever = vectorstore.as_retriever(
        search_kwargs={"k": 4}
    )
    docs = retriever.invoke(question)
    context = "\n\n".join([doc.page_content for doc in docs])

    # Step 4: Answer the question
    prompt = ChatPromptTemplate.from_template("""
    You are an RFP analyst. Answer the user's question
    based ONLY on the RFP content provided below.

    If the answer is not in the RFP, say:
    "This information is not mentioned in the RFP."

    RFP CONTENT:
    {context}

    USER QUESTION:
    {question}

    Give a clear, direct answer in 2-3 sentences.
    """)

    chain = prompt | get_llm() | parser
    answer = await chain.ainvoke({
        "context": context,
        "question": question
    })

    return answer