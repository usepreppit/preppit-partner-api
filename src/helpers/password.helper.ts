import bcrypt from 'bcryptjs';
export const hashPassword = async (password: string): Promise<string> => {
    const salt = bcrypt.genSaltSync(12);
    return await bcrypt.hash(password, salt);
};

export const comparePasswords = async (
    candidatePassword: string,
    hashedPassword: string
): Promise<boolean> => {
    return await bcrypt.compare(candidatePassword, hashedPassword);
};

