import { useEffect, useState } from "react";
import axios from "axios";

const API = "/api";


// ==========================================
// MAIN APP
// ==========================================

function App() {

    const [page, setPage] = useState(
        localStorage.getItem("token")
            ? "dashboard"
            : "landing"
    );

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [name, setName] = useState("");

    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const [user, setUser] = useState(
        JSON.parse(localStorage.getItem("user") || "null")
    );


    // ==========================================
    // LOGIN
    // ==========================================

    const login = async (e) => {

        e.preventDefault();

        setError("");
        setLoading(true);

        try {

            const response = await axios.post(
                `${API}/auth/login`,
                {
                    email,
                    password,
                }
            );

            localStorage.setItem(
                "token",
                response.data.token
            );

            localStorage.setItem(
                "user",
                JSON.stringify(response.data.user)
            );

            setUser(response.data.user);
            setPage("dashboard");

        } catch (err) {

            setError(
                err.response?.data?.error ||
                "Login failed"
            );

        } finally {

            setLoading(false);

        }
    };


    // ==========================================
    // REGISTER
    // ==========================================

    const register = async (e) => {

        e.preventDefault();

        setError("");
        setLoading(true);

        try {

            await axios.post(
                `${API}/auth/register`,
                {
                    name,
                    email,
                    password,
                }
            );

            setName("");
            setPassword("");

            setPage("login");

            setError(
                "Registration successful. Please login."
            );

        } catch (err) {

            setError(
                err.response?.data?.error ||
                "Registration failed"
            );

        } finally {

            setLoading(false);

        }
    };


    // ==========================================
    // LOGOUT
    // ==========================================

    const logout = () => {

        localStorage.removeItem("token");
        localStorage.removeItem("user");

        setUser(null);
        setPage("landing");

    };


    // ==========================================
    // PAGE ROUTING
    // ==========================================

    if (page === "login") {

        return (
            <AuthPage
    title="Welcome back"
    subtitle="Sign in to your rewards counter"
    buttonText={
        loading
            ? "Signing in..."
            : "Sign In"
    }
    loading={loading}
                name={name}
                email={email}
                password={password}
                setName={setName}
                setEmail={setEmail}
                setPassword={setPassword}
                error={error}
                onSubmit={login}
                onSwitch={() => {
                    setError("");
                    setPage("register");
                }}
                switchText="Create an account"
            />
        );

    }


    if (page === "register") {

        return (
           <AuthPage
    title="Create account"
    subtitle="Set up your café rewards counter"
    buttonText={
        loading
            ? "Creating account..."
            : "Create Account"
    }
    loading={loading}
                name={name}
                email={email}
                password={password}
                setName={setName}
                setEmail={setEmail}
                setPassword={setPassword}
                error={error}
                onSubmit={register}
                onSwitch={() => {
                    setError("");
                    setPage("login");
                }}
                switchText="Already have an account? Sign in"
                register
            />
        );

    }


    if (page === "dashboard") {

        return (
            <Dashboard
                user={user}
                logout={logout}
            />
        );

    }


    return (
        <Landing
            onLogin={() => {
                setError("");
                setPage("login");
            }}
            onRegister={() => {
                setError("");
                setPage("register");
            }}
        />
    );
}


// ==========================================
// LANDING PAGE
// ==========================================

function Landing({ onLogin, onRegister }) {

    return (
        <div className="landing">

            <nav className="navbar">

                <div className="brand">

                    <div className="brand-icon">
                        B
                    </div>

                    <span>
                        BEAN & BOARD
                    </span>

                </div>

                <div className="nav-actions">

                    <button
                        className="link-button"
                        onClick={onLogin}
                    >
                        Login
                    </button>

                    <button
                        className="nav-cta"
                        onClick={onRegister}
                    >
                        Get Started
                    </button>

                </div>

            </nav>


            <section className="hero">

                <div className="hero-copy">

                    <div className="eyebrow">
                        CAFÉ REWARDS PLATFORM
                    </div>

                    <h1>
                        Make every visit
                        <br />
                        <span>worth more.</span>
                    </h1>

                    <p>
                        A simple rewards counter that helps cafés
                        track purchases, calculate points,
                        manage member tiers, and redeem rewards
                        without losing track of a single point.
                    </p>

                    <div className="hero-actions">

                        <button
                            className="primary-btn"
                            onClick={onRegister}
                        >
                            Start Managing Rewards →
                        </button>

                        <button
                            className="secondary-btn"
                            onClick={onLogin}
                        >
                            Staff Login
                        </button>

                    </div>

                </div>


                <div className="hero-card">

                    <div className="hero-card-top">

                        <span>
                            MEMBER BALANCE
                        </span>

                        <span>
                            ● LIVE
                        </span>

                    </div>

                    <div className="hero-points">
                        500
                    </div>

                    <div className="hero-label">
                        points available
                    </div>

                    <div className="hero-tier">
                        ★ SILVER MEMBER
                    </div>

                </div>

            </section>


            <section className="features">

                <div className="section-heading">

                    <div className="eyebrow">
                        EVERYTHING AT THE COUNTER
                    </div>

                    <h2>
                        Built around the moments
                        that matter.
                    </h2>

                </div>


                <div className="feature-grid">

                    <Feature
                        icon="＋"
                        title="Automatic Points"
                        text="Every purchase calculates the correct points using the member's current tier."
                    />

                    <Feature
                        icon="★"
                        title="Tier Progression"
                        text="Members progress from Bronze to Silver and Gold using lifetime earned points."
                    />

                    <Feature
                        icon="◆"
                        title="Easy Redemption"
                        text="Redeem rewards instantly while preventing insufficient-point transactions."
                    />

                </div>

            </section>


            <section className="audience-section">

                <div>

                    <div className="eyebrow">
                        MADE FOR CAFÉS
                    </div>

                    <h2>
                        Less counting.
                        <br />
                        More connecting.
                    </h2>

                </div>

                <p>
                    Staff get a fast member lookup and transaction
                    workflow, while café owners get reliable loyalty
                    records and a clear history of every point earned
                    and redeemed.
                </p>

            </section>


            <section className="future-section">

                <div className="eyebrow">
                    NEXT UP
                </div>

                <h2>
                    Where we can take it next.
                </h2>


                <div className="future-grid">

                    <Feature
                        icon="01"
                        title="Mobile Member App"
                        text="Let members track balances, tiers and rewards from their phones."
                    />

                    <Feature
                        icon="02"
                        title="Personalized Offers"
                        text="Use purchase behaviour to create relevant rewards and offers."
                    />

                    <Feature
                        icon="03"
                        title="Loyalty Analytics"
                        text="Give café owners insight into spending, retention and reward usage."
                    />

                </div>

            </section>


            <footer>
                © 2026 Bean & Board · Café Rewards Counter
            </footer>

        </div>
    );
}


// ==========================================
// FEATURE COMPONENT
// ==========================================

function Feature({ icon, title, text }) {

    return (
        <div className="feature-card">

            <div className="feature-icon">
                {icon}
            </div>

            <h3>
                {title}
            </h3>

            <p>
                {text}
            </p>

        </div>
    );
}


// ==========================================
// AUTH PAGE
// ==========================================

function AuthPage({
    title,
    subtitle,
    buttonText,
    name,
    email,
    password,
    setName,
    setEmail,
    setPassword,
    error,
    loading,
    onSubmit,
    onSwitch,
    switchText,
    register = false,
}) {

    return (
        <div className="auth-page">

            <div className="auth-card">

                <div className="auth-brand">

                    <div className="brand-icon">
                        B
                    </div>

                    <span>
                        BEAN & BOARD
                    </span>

                </div>


                <h1>
                    {title}
                </h1>

                <p className="auth-subtitle">
                    {subtitle}
                </p>


                {error && (
                    <div className="auth-message">
                        {error}
                    </div>
                )}


                <form onSubmit={onSubmit}>

                    {register && (
                        <>
                            <label>
                                Name
                            </label>

                            <input
                                type="text"
                                placeholder="Your name"
                                value={name}
                                onChange={(e) =>
                                    setName(e.target.value)
                                }
                                required
                            />
                        </>
                    )}


                    <label>
                        Email
                    </label>

                    <input
                        type="email"
                        placeholder="admin@cafe.com"
                        value={email}
                        onChange={(e) =>
                            setEmail(e.target.value)
                        }
                        required
                    />


                    <label>
                        Password
                    </label>

                    <input
                        type="password"
                        placeholder="Minimum 6 characters"
                        value={password}
                        onChange={(e) =>
                            setPassword(e.target.value)
                        }
                        minLength={6}
                        required
                    />


                    <button
                        type="submit"
                        className="primary-btn full"
                        disabled={loading}
                    >
                        {buttonText}
                    </button>

                </form>


                <button
                    className="switch-button"
                    onClick={onSwitch}
                >
                    {switchText}
                </button>

            </div>

        </div>
    );
}


// ==========================================
// DASHBOARD
// ==========================================

function Dashboard({ user, logout }) {

    return (
        <div className="dashboard">

            <nav className="navbar">

                <div className="brand">

                    <div className="brand-icon">
                        B
                    </div>

                    <span>
                        BEAN & BOARD
                    </span>

                </div>


                <div className="counter-info">

                    <span className="online-dot"></span>

                    Eastside · Counter 01

                </div>


                <div className="staff-info">

                    <div className="avatar">
                        {user?.name?.charAt(0) || "A"}
                    </div>

                    <span>
                        {user?.name || "Staff"}
                    </span>

                    <button
                        className="logout-button"
                        onClick={logout}
                    >
                        Logout
                    </button>

                </div>

            </nav>


            <main className="dashboard-main">

                <div className="dashboard-heading">

                    <div>

                        <div className="eyebrow">
                            REWARDS DESK
                        </div>

                        <h1>
                            Member counter
                        </h1>

                        <p>
                            Keep every visit, point,
                            and reward in step.
                        </p>

                    </div>


                    <div className="date-box">

                        □ &nbsp;

                        {new Date().toLocaleDateString(
                            "en-US",
                            {
                                weekday: "long",
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                            }
                        )}

                    </div>

                </div>


                <MemberDashboard />

            </main>

        </div>
    );
}


// ==========================================
// MEMBER DASHBOARD
// ==========================================

function MemberDashboard() {

    const [members, setMembers] = useState([]);

    const [selectedMember, setSelectedMember] =
        useState(null);

    const [transactions, setTransactions] =
        useState([]);

    const [rewards, setRewards] =
        useState([]);

    const [search, setSearch] =
        useState("");

    const [page, setPage] =
        useState(1);

    const [totalPages, setTotalPages] =
        useState(1);

        const [sortBy, setSortBy] =
    useState("created");

const [order, setOrder] =
    useState("desc");

    const [loading, setLoading] =
        useState(false);

    const [message, setMessage] =
        useState("");

    const [showAddMember, setShowAddMember] =
        useState(false);


    const token =
        localStorage.getItem("token");


    const headers = {
        Authorization: `Bearer ${token}`,
    };


    // ==========================================
    // LOAD MEMBERS
    // ==========================================

    const loadMembers = async () => {

        setLoading(true);

        try {

            const response = await axios.get(
                `${API}/members`,
                {
                    params: {
    search,
    page,
    limit: 10,
    sortBy,
    order,
},
                    headers,
                }
            );


            setMembers(
                response.data.data
            );


            setTotalPages(
                response.data.pagination?.totalPages || 1
            );


            // Select first member if nothing selected
            if (
                !selectedMember &&
                response.data.data.length > 0
            ) {

                selectMember(
                    response.data.data[0]
                );

            }


        } catch (error) {

            if (
                error.response?.status === 401
            ) {

                localStorage.removeItem("token");
                localStorage.removeItem("user");

                window.location.reload();

                return;
            }


            setMessage(
                error.response?.data?.error ||
                "Failed to load members"
            );

        } finally {

            setLoading(false);

        }
    };


    // ==========================================
    // LOAD REWARDS
    // ==========================================

    const loadRewards = async () => {

        try {

            const response = await axios.get(
                `${API}/rewards`,
                {
                    headers,
                }
            );

            setRewards(
                response.data.data
            );

        } catch (error) {

            console.error(
                "Rewards error:",
                error
            );

        }
    };


    // ==========================================
    // SELECT MEMBER
    // ==========================================

    const selectMember = async (member) => {

        setSelectedMember(member);

        try {

            const response = await axios.get(
                `${API}/members/${member.id}`,
                {
                    headers,
                }
            );

            setSelectedMember(
                response.data.member
            );


            const history =
                await axios.get(
                    `${API}/members/${member.id}/transactions`,
                    {
                        headers,
                    }
                );


            setTransactions(
                history.data.data
            );


        } catch (error) {

            setMessage(
                error.response?.data?.error ||
                "Failed to load member"
            );

        }
    };


    // ==========================================
    // RECORD PURCHASE
    // ==========================================

    const recordPurchase = async (amount) => {

        if (!selectedMember) {
            return;
        }


        try {

            const response =
                await axios.post(
                    `${API}/members/${selectedMember.id}/purchases`,
                    {
                        amount: Number(amount),
                    },
                    {
                        headers,
                    }
                );


            setSelectedMember(
                response.data.member
            );


            setMessage(
                `Purchase recorded. +${response.data.purchase.earnedPoints} points`
            );


            await refreshMember(
                response.data.member.id
            );


            await loadMembers();

        } catch (error) {

            setMessage(
                error.response?.data?.error ||
                "Purchase failed"
            );

        }
    };


    // ==========================================
    // REDEEM REWARD
    // ==========================================

    const redeemReward = async (rewardId) => {

        if (!selectedMember) {
            return;
        }


        try {

            const response =
                await axios.post(
                    `${API}/members/${selectedMember.id}/redeem`,
                    {
                        rewardId,
                    },
                    {
                        headers,
                    }
                );


            setSelectedMember(
                response.data.member
            );


            setMessage(
                `${response.data.redemption.reward} redeemed successfully`
            );


            await refreshMember(
                response.data.member.id
            );


            await loadMembers();

        } catch (error) {

            setMessage(
                error.response?.data?.error ||
                "Redemption failed"
            );

        }
    };


    // ==========================================
    // REFRESH MEMBER
    // ==========================================

    const refreshMember = async (memberId) => {

        const memberResponse =
            await axios.get(
                `${API}/members/${memberId}`,
                {
                    headers,
                }
            );


        setSelectedMember(
            memberResponse.data.member
        );


        const transactionResponse =
            await axios.get(
                `${API}/members/${memberId}/transactions`,
                {
                    headers,
                }
            );


        setTransactions(
            transactionResponse.data.data
        );
    };


    // ==========================================
    // ADD MEMBER
    // ==========================================

    const addMember = async (memberData) => {

        try {

            await axios.post(
                `${API}/members`,
                memberData,
                {
                    headers,
                }
            );


            setMessage(
                "Member created successfully"
            );


            setShowAddMember(false);

            await loadMembers();

        } catch (error) {

            setMessage(
                error.response?.data?.error ||
                "Failed to create member"
            );

        }
    };


    // ==========================================
    // INITIAL DATA LOAD
    // ==========================================

    useEffect(() => {

        loadMembers();
        loadRewards();

    }, []);


    // ==========================================
    // SEARCH
    // ==========================================

    const handleSearch = (value) => {

        setSearch(value);
        setPage(1);

    };


    const executeSearch = () => {

        setPage(1);

        setTimeout(() => {
            loadMembers();
        }, 0);

    };


    // ==========================================
    // PAGINATION
    // ==========================================

    const nextPage = () => {

        if (page < totalPages) {

            setPage((current) =>
                current + 1
            );

        }

    };


    const previousPage = () => {

        if (page > 1) {

            setPage((current) =>
                current - 1
            );

        }

    };


    // Reload whenever page changes
    useEffect(() => {

    loadMembers();

}, [page, sortBy, order]);


    // ==========================================
    // CURRENT EARNING RATE
    // ==========================================

    const currentRate =
        selectedMember?.tier === "Platinum"
            ? "3X"
            : selectedMember?.tier === "Gold"
                ? "3X"
                : selectedMember?.tier === "Silver"
                    ? "2X"
                    : "1X";


    return (
        <>
            <div className="dashboard-grid">

                {/* ==================================
                    MEMBERS PANEL
                ================================== */}

                <aside className="members-panel">

                    <div className="members-header">

                        <div>

                            <h2>
                                Members
                            </h2>

                            <span>
                                {members.length} shown
                            </span>

                        </div>


                        <button
                            className="add-member"
                            onClick={() =>
                                setShowAddMember(true)
                            }
                        >
                            +
                        </button>

                    </div>


                    <div className="search-wrapper">

                        <input
                            className="search-input"
                            placeholder="Search by phone number"
                            value={search}
                            onChange={(e) =>
                                handleSearch(
                                    e.target.value
                                )
                            }
                            onKeyDown={(e) => {

                                if (
                                    e.key === "Enter"
                                ) {
                                    executeSearch();
                                }

                            }}
                        />

                        <button
                            className="search-button"
                            onClick={executeSearch}
                        >
                            Search
                        </button>

                    </div>

                    <div className="sort-wrapper">

    <select
        value={sortBy}
        onChange={(e) => {
            setSortBy(e.target.value);
            setPage(1);
        }}
    >
        <option value="created">
            Recent
        </option>

        <option value="name">
            Name
        </option>

        <option value="points">
            Points
        </option>

        <option value="tier">
            Tier
        </option>
    </select>


    <select
        value={order}
        onChange={(e) => {
            setOrder(e.target.value);
            setPage(1);
        }}
    >
        <option value="desc">
            Descending
        </option>

        <option value="asc">
            Ascending
        </option>
    </select>

</div>


                    <div className="member-list">

                        {loading ? (

                            <div className="empty-state">
                                Loading members...
                            </div>

                        ) : members.length === 0 ? (

                            <div className="empty-state">
                                No members found
                            </div>

                        ) : (

                            members.map((member) => (

                                <button
                                    key={member.id}
                                    className={
                                        selectedMember?.id === member.id
                                            ? "member-row active"
                                            : "member-row"
                                    }
                                    onClick={() =>
                                        selectMember(member)
                                    }
                                >

                                    <div className="member-avatar">

                                        {member.name
                                            .split(" ")
                                            .map(
                                                (n) => n[0]
                                            )
                                            .join("")
                                            .slice(0, 2)}

                                    </div>


                                    <div className="member-info">

                                        <strong>
                                            {member.name}
                                        </strong>

                                        <span>
                                            {member.phone}
                                        </span>

                                    </div>


                                    <div
                                        className={
                                            `tier-dot ${member.tier.toLowerCase()}`
                                        }
                                    />

                                </button>

                            ))

                        )}

                    </div>


                    {/* Pagination */}

                    <div className="pagination">

                        <button
                            onClick={previousPage}
                            disabled={page === 1}
                        >
                            ←
                        </button>

                        <span>
                            Page {page} of {totalPages}
                        </span>

                        <button
                            onClick={nextPage}
                            disabled={
                                page >= totalPages
                            }
                        >
                            →
                        </button>

                    </div>

                </aside>


                {/* ==================================
                    MEMBER CONTENT
                ================================== */}

                <section className="member-content">

                    {!selectedMember ? (

                        <div className="empty-large">
                            Select a member
                        </div>

                    ) : (

                        <>

                            {/* MEMBER HEADER */}

                            <div className="member-header-card">

                                <div className="large-avatar">

                                    {selectedMember.name
                                        .split(" ")
                                        .map(
                                            (n) => n[0]
                                        )
                                        .join("")
                                        .slice(0, 2)}

                                </div>


                                <div>

                                    <div className="member-title">

                                        <h2>
                                            {selectedMember.name}
                                        </h2>

                                        <span className="tier-badge">
                                            ★ {selectedMember.tier}
                                        </span>

                                    </div>


                                    <p>
                                        {selectedMember.phone}
                                    </p>


                                    <small>

                                        Member since{" "}

                                        {new Date(
                                            selectedMember.created_at
                                        ).toLocaleDateString()}

                                    </small>

                                </div>

                            </div>


                            {/* STATS */}

                            <div className="stats-grid">

                                <div className="stat-card dark">

                                    <span>
                                        Available points
                                    </span>

                                    <strong>
                                        {
                                            selectedMember.points_balance
                                        }
                                    </strong>

                                    <small>
                                        points ready to redeem
                                    </small>

                                </div>


                                <div className="stat-card">

                                    <span>
                                        Lifetime earned
                                    </span>

                                    <strong>
                                        {
                                            selectedMember.lifetime_earned_points
                                        }
                                    </strong>

                                    <small>
                                        points earned in total
                                    </small>

                                </div>


                                <div className="stat-card">

                                    <span>
                                        Current earn rate
                                    </span>

                                    <strong>
                                        {currentRate}
                                    </strong>

                                    <small>
                                        {selectedMember.tier} member rate
                                    </small>

                                </div>

                            </div>


                            {/* ACTIONS */}

                            <div className="action-grid">

                                <PurchaseCard
                                    onPurchase={
                                        recordPurchase
                                    }
                                    tier={
                                        selectedMember.tier
                                    }
                                />


                                <RedeemCard
                                    rewards={rewards}
                                    balance={
                                        selectedMember.points_balance
                                    }
                                    onRedeem={
                                        redeemReward
                                    }
                                />

                            </div>


                            {/* TRANSACTION HISTORY */}

                            <div className="history-card">

                                <div className="history-header">

                                    <div>

                                        <h2>
                                            Transaction history
                                        </h2>

                                        <span>
                                            Every point earned and redeemed
                                        </span>

                                    </div>

                                </div>


                                {transactions.length === 0 ? (

                                    <div className="empty-state">
                                        No transactions yet.
                                    </div>

                                ) : (

                                    <div className="transaction-list">

                                        {transactions.map(
                                            (transaction) => (

                                                <div
                                                    className="transaction-row"
                                                    key={transaction.id}
                                                >

                                                    <div>

                                                        <strong>
                                                            {
                                                                transaction.description
                                                            }
                                                        </strong>

                                                        <span>

                                                            {new Date(
                                                                transaction.created_at
                                                            ).toLocaleString()}

                                                        </span>

                                                    </div>


                                                    <strong
                                                        className={
                                                            transaction.type === "EARN"
                                                                ? "earn"
                                                                : "redeem"
                                                        }
                                                    >

                                                        {transaction.points > 0
                                                            ? "+"
                                                            : ""}

                                                        {transaction.points}

                                                    </strong>

                                                </div>

                                            )
                                        )}

                                    </div>

                                )}

                            </div>


                            {message && (

                                <div className="toast">

                                    {message}

                                    <button
                                        onClick={() =>
                                            setMessage("")
                                        }
                                    >
                                        ×
                                    </button>

                                </div>

                            )}

                        </>

                    )}

                </section>

            </div>


            {/* ADD MEMBER MODAL */}

            {showAddMember && (

                <AddMemberModal
                    onClose={() =>
                        setShowAddMember(false)
                    }
                    onAdd={addMember}
                />

            )}

        </>
    );
}


// ==========================================
// PURCHASE CARD
// ==========================================

function PurchaseCard({
    onPurchase,
    tier,
}) {

    const [amount, setAmount] =
        useState("");


    const submit = () => {

        if (
            !amount ||
            Number(amount) <= 0
        ) {
            return;
        }


        onPurchase(amount);

        setAmount("");

    };


    const rate =
        tier === "Platinum"
            ? "3 points / ₹10"
            : tier === "Gold"
                ? "3 points / ₹10"
                : tier === "Silver"
                    ? "2 points / ₹10"
                    : "1 point / ₹10";


    return (
        <div className="action-card">

            <div className="action-heading">

                <div className="action-icon green">
                    +
                </div>


                <div>

                    <h2>
                        Record a purchase
                    </h2>

                    <p>
                        {tier} rate · {rate}
                    </p>

                </div>

            </div>


            <input
                className="amount-input"
                type="number"
                min="1"
                step="0.01"
                placeholder="₹ 0.00"
                value={amount}
                onChange={(e) =>
                    setAmount(e.target.value)
                }
                onKeyDown={(e) => {

                    if (e.key === "Enter") {
                        submit();
                    }

                }}
            />


            <button
                className="action-button green-button"
                onClick={submit}
                disabled={
                    !amount ||
                    Number(amount) <= 0
                }
            >
                Add points →
            </button>

        </div>
    );
}


// ==========================================
// REDEEM CARD
// ==========================================

function RedeemCard({
    rewards,
    balance,
    onRedeem,
}) {

    return (
        <div className="action-card">

            <div className="action-heading">

                <div className="action-icon peach">
                    ✦
                </div>


                <div>

                    <h2>
                        Redeem a reward
                    </h2>

                    <p>
                        Use points for a free café reward.
                    </p>

                </div>

            </div>


            <div className="reward-list">

                {rewards.length === 0 ? (

                    <div className="empty-state">
                        No rewards available.
                    </div>

                ) : (

                    rewards.map((reward) => {

                        const canRedeem =
                            balance >=
                            reward.points_required;


                        return (

                            <div
                                className="reward-row"
                                key={reward.id}
                            >

                                <div>

                                    <strong>
                                        {reward.name}
                                    </strong>

                                    <span>
                                        {reward.description}
                                    </span>

                                </div>


                                <div className="reward-action">

                                    <span>
                                        {
                                            reward.points_required
                                        } pts
                                    </span>


                                    <button
                                        disabled={
                                            !canRedeem
                                        }
                                        onClick={() =>
                                            onRedeem(
                                                reward.id
                                            )
                                        }
                                    >
                                        {canRedeem
                                            ? "Redeem"
                                            : "Need more"}
                                    </button>

                                </div>

                            </div>

                        );

                    })

                )}

            </div>

        </div>
    );
}


// ==========================================
// ADD MEMBER MODAL
// ==========================================

function AddMemberModal({
    onClose,
    onAdd,
}) {

    const [name, setName] =
        useState("");

    const [phone, setPhone] =
        useState("");

    const [email, setEmail] =
        useState("");


    const submit = (e) => {

        e.preventDefault();

        onAdd({
            name,
            phone,
            email,
        });

    };


    return (
        <div className="modal-overlay">

            <div className="modal">

                <div className="modal-header">

                    <div>

                        <h2>
                            Add member
                        </h2>

                        <p>
                            Create a new café rewards member.
                        </p>

                    </div>


                    <button
                        className="modal-close"
                        onClick={onClose}
                    >
                        ×
                    </button>

                </div>


                <form onSubmit={submit}>

                    <label>
                        Name
                    </label>

                    <input
                        type="text"
                        placeholder="Rahul Sharma"
                        value={name}
                        onChange={(e) =>
                            setName(e.target.value)
                        }
                        required
                    />


                    <label>
                        Phone number
                    </label>

                    <input
                        type="tel"
                        placeholder="9876543210"
                        value={phone}
                        onChange={(e) =>
                            setPhone(e.target.value)
                        }
                        required
                    />


                    <label>
                        Email
                    </label>

                    <input
                        type="email"
                        placeholder="rahul@example.com"
                        value={email}
                        onChange={(e) =>
                            setEmail(e.target.value)
                        }
                    />


                    <div className="modal-actions">

                        <button
                            type="button"
                            className="secondary-btn"
                            onClick={onClose}
                        >
                            Cancel
                        </button>

                        <button
                            type="submit"
                            className="primary-btn"
                        >
                            Add Member
                        </button>

                    </div>

                </form>

            </div>

        </div>
    );
}


export default App;